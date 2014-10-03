HE = window.HE || {};

HE = function() {
    var options = {
//        normally this will be retrieved from the configuration service
        configurationUrl: '//127.0.0.1:9000/example/config.json'
    };

    var init = function (options_) {
        getSdkConfig();

        for (var key in options_) {
            options[key] = options_[key];
        }

        console.debug('SDK initialized with options: ' + JSON.stringify(options));

        return this;
    };

    var getToken = function (msisdn, successCallback, errorCallback) {
        HE.Throttling.incrementCounter();
        HE.Token.get(msisdn, successCallback, errorCallback);
    };

    var confirmToken = function (successCallback, errorCallback) {
        HE.Throttling.incrementCounter();
        HE.Token.confirm(successCallback, errorCallback);
    };

    var getSdkConfig = function() {
        checkConfig(['configurationUrl']);

        $.ajax({
            url: options.configurationUrl,
            type: 'GET',
            async: false,
            success: function(data) {
                console.debug('Received SDK configuration ' + JSON.stringify(data));
                for (var key in data) {
                    options[key] = data[key];
                }
            },
            error: function (request, status, error) {
                throw new Error('Error occurred while getting configuration at ' + options.configurationUrl +
                    ', status: ' + status +
                    ', error: ' + error);
            }
        });
    };

    var checkConfig = function (mandatoryOptions) {
        if (!mandatoryOptions.every(function(element, index, array) {
            return options[element] !== undefined;
        })) {
            throw new Error('Improperly configured - ' + mandatoryOptions + ' are mandatory');
        }
    };

    return {
        init: init,
        getToken: getToken,
        confirmToken: confirmToken,
        config: options,
        checkConfig: checkConfig
    };
}();

HE.Apix = function() {
    var appToken;

    var getAppToken = function() {
        if (appToken) {
            return appToken;
        } else {
            HE.checkConfig(['apixAuthUrl', 'apixGrantType', 'clientAppKey', 'clientAppSecret', 'apixScope']);

            $.ajax({
                url: HE.config.apixAuthUrl,
                type: 'POST',
                async: false,
                data: 'grant_type=' + HE.config.apixGrantType +
                    '&client_id=' + HE.config.clientAppKey +
                    '&client_secret=' + HE.config.clientAppSecret +
                    '&scope=' + HE.config.apixScope,
                headers: HE.Trace.getHeaders(),
                success: function(data) {
                    console.debug('Received apix auth data ' + JSON.stringify(data));
                    appToken = data.token_type + data.access_token;
                    console.info('Set the apix token to ' + appToken);
                },
                error: function (request, status, error) {
                    console.error('Error occurred while getting authentication token at ' + HE.config.apixAuthUrl +
                        ', status: ' + status +
                        ', error: ' + error);
                }
            });

            return appToken;
        }
    };

    return {
        getAppToken: getAppToken
    };
}();

HE.Throttling = function () {
    var incrementCounter = function () {
        var throttlingValue = parseInt(HE.Storage.get(HE.config.throttlingCookieName), 10);
        var throttlingExpiration = new Date(HE.Storage.get(HE.config.throttlingCookieExpirationName));

        if (throttlingValue && throttlingExpiration && new Date() < throttlingExpiration) {
            if (throttlingValue >= HE.config.throttlingPerPeriodLimit) {
                throw new Error('Throttling exceeded');
            } else {
                HE.Storage.set(HE.config.throttlingCookieName, throttlingValue + 1);
            }
        } else {
            var date = new Date();
            date.setTime(date.getTime() + (HE.config.throttlingPeriodMinutes * 60 * 1000));
            HE.Storage.set(HE.config.throttlingCookieName, 1);
            HE.Storage.set(HE.config.throttlingCookieExpirationName, date);
        }
    };

    return {
        incrementCounter: incrementCounter
    };
}();

HE.Trace = function() {
    var fingerprint = new Fingerprint();
    var parser = new UAParser();

    var getSubjectId = function() {
        if (HE.config.cookiesAllowed) {
            if (!HE.Storage.get(HE.config.subjectIdCookieName)) {
                HE.Storage.set(
                    HE.config.subjectIdCookieName,
                    parser.getOS().name + ' ' + parser.getOS().version + ' \\ ' +
                        parser.getBrowser().name + ' ' + parser.getBrowser().version + ' \\ ' +
                        fingerprint.get()
                );
            }

            return HE.Storage.get(HE.config.subjectIdCookieName);
        }

        return parser.getOS().name + ' ' + parser.getOS().version + ' \\ ' +
            parser.getBrowser().name + ' ' + parser.getBrowser().version + ' \\ ' +
            fingerprint.get();
    };

    var getUserCountry = function() {
        return window.navigator.language.substr(3, 5);
    };

    var getTransactionId = function() {
        return CryptoJS.MD5((fingerprint.get() + new Date().getMilliseconds()).toString());
    };

    var getHeaders = function() {
        return {
            'x-vf-trace-subject-region': getUserCountry(),
            'x-vf-trace-source': HE.config.sdkId + '-' + HE.config.applicationId,
            'x-vf-trace-transaction-id': getTransactionId(),
            'x-vf-trace-subject-id': getSubjectId()
        };
    };

    return {
        getHeaders: getHeaders
    };
}();

HE.Token = function() {
    var get = function(msisdn, successCallback, errorCallback) {
        if (msisdn) {
            if (msisdnValid(msisdn)) {
                callApix(msisdn, successCallback, errorCallback);
            } else {
                errorCallback(new HE.Result(HE.Result.codes.INVALID_MSISDN, null, null));
            }
        } else {
            var protocol = window.location.protocol;

            console.debug('Protocol is ' + protocol);

            if (protocol === 'http:') {
                callHap(successCallback, errorCallback);
            } else {
                errorCallback(new HE.Result(HE.Result.codes.NO_MSISDN_UNDER_HTTPS,
                    "MSISDN was not provided - cannot get token under https protocol", null));
            }
        }
    };

    var callHap = function (successCallback, errorCallback) {
        HE.checkConfig(['hapResolveUrl']);

        callResolver(
            HE.config.hapResolveUrl,
            JSON.stringify({}),
            successCallback, errorCallback
        );
    };

    var callApix = function (msisdn, successCallback, errorCallback) {
        HE.checkConfig(['apixHost', 'apixResolveUrl']);

        callResolver(
            HE.config.apixHost + HE.config.apixResolveUrl,
            JSON.stringify({
                msisdn: msisdn,
                market: getMarket(msisdn)
            }),
            successCallback, errorCallback
        );
    };

    var callResolver = function(url, data, successCallback, errorCallback) {
        console.info('Getting token from ' + url);

        $.ajax({
            url: url + '?backendId=' + HE.config.applicationId,
            type: 'POST',
            data: data,
            contentType: 'application/json',
            crossDomain: true,
            headers: function() {
                var headers = HE.Trace.getHeaders();
//                application authorization skipped due to required APIX changed (CORS support)
//                headers['Authorization'] = HE.Apix.getAppToken();
                headers.backendScopes = 'seamless_id_user_details_acr_static';

//                the following two headers will be set by HAP in the final solution
//                headers['x-sdp-msisdn'] = '491741863437';
//                headers['x-int-opco'] = 'DE';
                return headers;
            }(),
            success: function (data, status, xhr) {
                if (data) {
                    console.debug('Received token data ' + JSON.stringify(data));

                    successCallback(new HE.Result(HE.Result.codes.TOKEN_CREATED, null, data));
                } else if (xhr.getResponseHeader('Location')) {
                    console.debug('OTP validation required, location is ' + xhr.getResponseHeader('Location'));

                    generateCode(xhr.getResponseHeader('Location'), successCallback, errorCallback);
                } else {
                    errorCallback(new HE.Result(HE.Result.codes.INVALID_DATA, null, null));
                }
            },
            error: function (request, status, error) {
                var message = 'Error occurred while getting token from ' + url +
                    ', status: ' + status +
                    ', error: ' + error;

                console.error(message);

                errorCallback(new HE.Result(HE.Result.codes.ERROR, message, null));
            }
        });
    };

    var generateCode = function(confirmUrl, successCallback, errorCallback) {
        HE.Storage.set(HE.config.tokenConfirmUrlKey, confirmUrl);

        $.ajax({
            url: HE.config.apixHost + confirmUrl,
            type: 'GET',
            headers: function() {
                var headers = HE.Trace.getHeaders();
//                application authorization skipped due to required APIX changed (CORS support)
//                headers['Authorization'] = HE.Apix.getAppToken();
                return headers;
            }(),
            success: function () {
                if (successCallback) {
                    successCallback(new HE.Result(HE.Result.codes.OTP_SMS_SENT, null, null));
                }
            },
            error: function (request, status, error) {
                var message = 'Error occurred while getting token from ' + confirmUrl +
                    ', status: ' + status +
                    ', error: ' + error;

                console.error(message);

                if (errorCallback) {
                    errorCallback(new HE.Result(HE.Result.codes.ERROR, message, null));
                }
            }
        });
    };

    var confirmCode = function(code, successCallback, errorCallback) {
        var confirmUrl = HE.Storage.get(HE.config.tokenConfirmUrlKey);

        console.info("Sending confirmation code to " + HE.config.apixHost + confirmUrl);

        $.ajax({
            url: HE.config.apixHost + confirmUrl,
            type: 'POST',
            data: JSON.stringify({
                code: code
            }),
            contentType: 'application/json',
            headers: function() {
                var headers = HE.Trace.getHeaders();
//                application authorization skipped due to required APIX changed (CORS support)
//                headers['Authorization'] = HE.Apix.getAppToken();
                return headers;
            }(),
            success: function (data) {
                if (data) {
                    console.debug('Received token data ' + JSON.stringify(data));
                    successCallback(new HE.Result(HE.Result.codes.TOKEN_CREATED, null, data));
                } else {
                    errorCallback(new HE.Result(HE.Result.codes.INVALID_DATA, null, null));
                }
            },
            error: function (request, status, error) {
                var message = 'Error occurred while sending code to ' + confirmUrl +
                    ', status: ' + status +
                    ', error: ' + error;

                console.error(message);

                if (errorCallback) {
                    errorCallback(new HE.Result(HE.Result.codes.ERROR, message, null));
                }
            }
        });
    };

    var msisdnValid = function(msisdn) {
        var re = new RegExp(HE.config.msisdnValidationPattern);

        if (re.exec(msisdn)) {
            return true;
        }

        return false;
    };

    var getMarket = function(msisdn) {
        var countryCode = msisdn.substring(0, 2);
        return HE.config.markets[countryCode];
    };

    return {
        get: get,
        confirm: confirmCode
    };
}();

HE.Storage = function () {
    var store = new Persist.Store('js-sdk');

    var key = CryptoJS.enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
    var iv = CryptoJS.enc.Hex.parse("101112131415161718191a1b1c1d1e1f");

    var set = function (name, value, options) {
        if (name && value) {
            var encryptedName = encrypt(name.toString());
            var encryptedValue = encrypt(value.toString());

            console.debug("Setting " + name + " under " + encryptedName);

            store.set(encryptedName, encryptedValue);
        }
    };

    var get = function (name) {
        var encryptedName = encrypt(name);

        console.debug("Getting " + name + " under " + encryptedName);

        var value = store.get(encryptedName);

        if (value) {
            return decrypt(value);
        }
    };

    var encrypt = function (plain) {
        return CryptoJS.Rabbit.encrypt(plain, key, { iv: iv }).toString();
    };

    var decrypt = function (encrypted) {
        return CryptoJS.Rabbit.decrypt(encrypted, key, { iv: iv }).toString(CryptoJS.enc.Utf8);
    };

    return {
        set: set,
        get: get
    };
}();

HE.Result = function (code, message, data) {
    this.code = code;
    this.message = message;
    this.data = data;
};

HE.Result.codes = {
    ERROR: 'ERROR',
    IMPROPERLY_CONFIGURED: 'IMPROPERLY_CONFIGURED',
    THROTTLING_EXCEEDED: 'THROTTLING_EXCEEDED',
    INVALID_DATA: 'INVALID_DATA',
    INVALID_MSISDN: 'INVALID_MSISDN',
    NO_MSISDN_UNDER_HTTPS: 'NO_MSISDN_UNDER_HTTPS',
    TOKEN_CREATED: 'TOKEN_CREATED',
    OTP_SMS_SENT: 'OTP_SMS_SENT'
};