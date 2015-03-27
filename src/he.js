Vodafone = window.Vodafone || {};

Vodafone = (function () {
    var init = function (mOptions, mInitCallback) {
        if (Vodafone.Configuration.isInitialized() && Vodafone.Apix.isIntialized()) {
            console.info("Already initialized.");
            mInitCallback(new Vodafone.Result(Vodafone.Result.codes.INITIALIZED, undefined, undefined));
            return;
        }

        try {
            Vodafone.Configuration.init(mOptions, function(result) {
                if (result.code === Vodafone.Result.codes.INITIALIZED) {
                    Vodafone.Apix.init(mInitCallback);
                }
            });
        } catch (e) {
            console.error("Error occurred");
            console.error(JSON.stringify(e, undefined, 2));
        }
    };

    var getToken = function (msisdn, successCallback, errorCallback) {
        try {
            _checkInitialization();
            Vodafone.Throttling.incrementCounter();
            Vodafone.Token.get(msisdn, successCallback, errorCallback);
        } catch (e) {
            errorCallback(new Vodafone.Result(Vodafone.Result.codes.ERROR, e.message, undefined));
        }
    };

    var confirmPin = function (code, successCallback, errorCallback) {
        console.debug("Confirming PIN " + code);
        try {
            _checkInitialization();
            if (code === undefined || code === '' || isNaN(code)) {
                throw new Error("The 'code' parameter is mandatory and it must be a numeric value");
            }
            Vodafone.Throttling.incrementCounter();
            Vodafone.Token.confirm(code, successCallback, errorCallback);
        } catch (e) {
            errorCallback(new Vodafone.Result(Vodafone.Result.codes.ERROR, e.message, undefined));
        }
    };

    var _checkInitialization = function () {
        if (!Vodafone.Configuration.isInitialized()) {
            throw new Error("SDK not initialized");
        }
    };

    return {
        init: init,
        getToken: getToken,
        confirmPin: confirmPin
    };
})();

Vodafone.Configuration = function() {
    var initialized = false;
    var configuration = {};

    var init = function (mOptions, mInitCallback) {
        console.debug("init");
        console.debug(JSON.stringify(mOptions, undefined, 2));

        if (initialized) {
            console.info("Already initialized.");
            mInitCallback(new Vodafone.Result(Vodafone.Result.codes.INITIALIZED, undefined, undefined));
            return;
        }

        try {
            _initDefaults();
            _getAndMergeSdkConfig(mOptions, mInitCallback);
        } catch (e) {
            console.error("Error occurred");
            console.error(JSON.stringify(e, undefined, 2));
        }
    };

    var getConfiguration = function() {
        return configuration;
    };

    var isInitialized = function() {
        return initialized;
    };

    var _initDefaults = function () {
        configuration.sdkId = "SeamlessIdJsSdk";
        configuration.cookiesAllowed = true;
        configuration.subjectIdCookieName = "subjectCookie";
        configuration.tokenConfirmUrlKey = "otpConfirmUrl";

        console.info("Initializing options");
        if (ENV == 'ASLAU') {
            console.info("Using environment ASLAU");
            configuration.configurationUrl = "http://aslau.com/config.json";
        }
        if (ENV == 'DEV') {
            console.info("Using environment DEV");
            configuration.configurationUrl = "http//localhost/sisdk/config.json";
        }
        if (ENV == 'PRE_PROD') {
            console.info("Using environment PRE_PROD");
            configuration.configurationUrl = "https://preprod.appconfig.shared.sp.vodafone.com/seamless-id/v1/sdk-config-js/config.json";
        }
        if (ENV == 'PROD') {
            console.info("Using environment PROD");
            configuration.configurationUrl = "https://preprod.appconfig.shared.sp.vodafone.com/seamless-id/v1/sdk-config-js/config.json";
        }
    };

    var _getAndMergeSdkConfig = function (_options, mInitCallback) {
        for (var key in _options) {
            configuration[key] = _options[key];
        }

        $.ajax({
            url: configuration.configurationUrl,
            type: 'GET',
            dataType: 'json',

            success: function (data) {
                console.debug('Received SDK configuration');
                console.debug(JSON.stringify(data, undefined, 2));
                for (var key in data) {
                    if (configuration[key] === undefined) {
                        configuration[key] = data[key];
                    }
                }

                _calculateCompoundProperties();

                initialized = true;
                console.info('Configuration initialisation done');
                console.debug(JSON.stringify(configuration, undefined, 2));

                mInitCallback(new Vodafone.Result(Vodafone.Result.codes.INITIALIZED, "SDK configuration initialized", data));
            },
            error: function (request, status, error) {
                var errorData = {
                    configUrl: configuration.configurationUrl,
                    status: status,
                    error: error
                };
                mInitCallback(new Vodafone.Result(Vodafone.Result.codes.ERROR, "Error while retrieving configuration", errorData));
            }
        });
    };

    var _calculateCompoundProperties = function() {
        var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );
        var android = ( navigator.userAgent.match(/(android|Android)/g) ? true : false );

        if (iOS) {
            configuration.hapResolveAbsoluteUrl = configuration.hap.protocol + "://" + configuration.hap.hostiOS + configuration.basePath;
        } else if (android) {
            configuration.hapResolveAbsoluteUrl = configuration.hap.protocol + "://" + configuration.hap.hostAndroid + configuration.basePath;
        } else {
            configuration.hapResolveAbsoluteUrl = configuration.hap.protocol + "://" + configuration.hap.host + configuration.basePath;
        }
        configuration.apixAuthAbsoluteUrl = configuration.apix.protocol + "://" + configuration.apix.host + configuration.apix.oAuthTokenPath;
        if (DIRECT) {
            configuration.apixBaseUrl = "http://SeamId-4090514559.eu-de1.plex.vodafone.com";
            configuration.apixResolveAbsoluteUrl = "http://SeamId-4090514559.eu-de1.plex.vodafone.com" + configuration.basePath;
        } else {
            configuration.apixBaseUrl = configuration.apix.protocol + "://" + configuration.apix.host;
            configuration.apixResolveAbsoluteUrl = configuration.apix.protocol + "://" + configuration.apix.host + configuration.basePath;
        }
    };

    return {
        init: init,
        getConfiguration: getConfiguration,
        isInitialized: isInitialized
    };
}();

Vodafone.Apix = function () {
    var appToken;
    var initialized = false;

    var init = function(mInitCallback) {
        console.debug("oAuth token NOT set. Retrieving it from APIX");
        var apixAuthUrl = Vodafone.Configuration.getConfiguration().apixAuthAbsoluteUrl;
        $.ajax({
            url: apixAuthUrl,
            type: 'POST',
            data: 'grant_type=' + Vodafone.Configuration.getConfiguration().apix.oAuthTokenGrantType +
                '&client_id=' + Vodafone.Configuration.getConfiguration().clientAppKey +
                '&client_secret=' + Vodafone.Configuration.getConfiguration().clientAppSecret +
                '&scope=' + Vodafone.Configuration.getConfiguration().apix.oAuthTokenScope,
            success: function (data) {
                console.debug('Received apix auth data ' + JSON.stringify(data));
                appToken = data.token_type +' '+ data.access_token;
                initialized = true;
                console.info('Set the apix token to ' + appToken);
                mInitCallback();
            },
            error: function (request, status, error) {
                console.error('Error occurred while getting authentication token at ' + apixAuthUrl +
                    ', status: ' + status +
                    ', error: ' + error);
                throw new Error('Error occurred while getting authentication token at ' + apixAuthUrl +
                    ', status: ' + status +
                    ', error: ' + error);
            }
        });
    };

    var getAppToken = function () {
        if (!initialized || appToken === undefined) {
            throw new Error("Apix is not initialized");
        }

        return appToken;
    };

    var isInitialized = function() {
        return initialized;
    };

    return {
        init: init,
        getAppToken: getAppToken,
        isInitialized: isInitialized
    };
}();

Vodafone.Throttling = function () {
    var incrementCounter = function () {
        var throttlingValue = parseInt(Vodafone.Storage.get(Vodafone.Configuration.getConfiguration().throttlingCookieName), 10);
        var throttlingExpiration = new Date(Vodafone.Storage.get(Vodafone.Configuration.getConfiguration().throttlingCookieExpirationName));

        if (throttlingValue && throttlingExpiration && new Date() < throttlingExpiration) {
            if (throttlingValue >= Vodafone.Configuration.getConfiguration().requestsThrottlingLimit) {
                throw new Error('Throttling exceeded');
            } else {
                Vodafone.Storage.set(Vodafone.Configuration.getConfiguration().throttlingCookieName, throttlingValue + 1);
            }
        } else {
            var date = new Date();
            date.setTime(date.getTime() + (Vodafone.Configuration.getConfiguration().requestsThrottlingPeriod * 1000));
            Vodafone.Storage.set(Vodafone.Configuration.getConfiguration().throttlingCookieName, 1);
            Vodafone.Storage.set(Vodafone.Configuration.getConfiguration().throttlingCookieExpirationName, date);
        }
    };

    return {
        incrementCounter: incrementCounter
    };
}();

Vodafone.Trace = function () {
    var fingerprint = new Fingerprint();
    var parser = new UAParser();

    var getSubjectId = function () {
        if (Vodafone.Configuration.getConfiguration().cookiesAllowed) {
            if (!Vodafone.Storage.get(Vodafone.Configuration.getConfiguration().subjectIdCookieName)) {
                Vodafone.Storage.set(
                    Vodafone.Configuration.getConfiguration().subjectIdCookieName,
                        parser.getOS().name + ' ' + parser.getOS().version + ' \\ ' +
                        parser.getBrowser().name + ' ' + parser.getBrowser().version + ' \\ ' +
                        fingerprint.get()
                );
            }

            return Vodafone.Storage.get(Vodafone.Configuration.getConfiguration().subjectIdCookieName);
        }

        return parser.getOS().name + ' ' + parser.getOS().version + ' \\ ' +
            parser.getBrowser().name + ' ' + parser.getBrowser().version + ' \\ ' +
            fingerprint.get();
    };

    var getUserCountry = function () {
        //FIXME: check the length of this parameter before doing the substring
        return window.navigator.language.substr(3, 5);
    };

    var getTransactionId = function () {
        return CryptoJS.MD5((fingerprint.get() + new Date().getMilliseconds()).toString());
    };

    var getHeaders = function () {
        return {
            'x-vf-trace-subject-region': getUserCountry(),
            'x-vf-trace-source': Vodafone.Configuration.getConfiguration().sdkId + '-' + Vodafone.Configuration.getConfiguration().clientAppKey,
            'x-vf-trace-transaction-id': getTransactionId(),
            'x-vf-trace-subject-id': getSubjectId()
        };
    };

    return {
        getHeaders: getHeaders
    };
}();

Vodafone.Token = function () {
    var get = function (msisdn, successCallback, errorCallback) {
        if (msisdn) {
            var msisdnObj = new Vodafone.MSISDN(msisdn);
            if (msisdnObj.isValid()) {
                _callApix(msisdnObj, successCallback, errorCallback);
            } else {
                errorCallback(new Vodafone.Result(Vodafone.Result.codes.INVALID_MSISDN, msisdnObj.getError(), null));
            }
        } else {
            var protocol = window.location.protocol;

            console.debug('Protocol is ' + protocol);

            if (protocol === 'http:') {
                _callHap(successCallback, errorCallback);
            } else {
                errorCallback(new Vodafone.Result(Vodafone.Result.codes.NO_MSISDN_UNDER_HTTPS,
                    "MSISDN was not provided - cannot get token under https protocol", null));
            }
        }
    };

    var _callHap = function (successCallback, errorCallback) {
        _callResolver(
            Vodafone.Configuration.getConfiguration().hapResolveAbsoluteUrl,
            {},
            successCallback, errorCallback
        );
    };

    var _callApix = function (MSISDN, successCallback, errorCallback) {
        _callResolver(
            Vodafone.Configuration.getConfiguration().apixResolveAbsoluteUrl,
            {
                msisdn: MSISDN.getValue(),
                market: MSISDN.getCountryCode()
            },
            successCallback, errorCallback
        );
    };

    var _callResolver = function (url, data, successCallback, errorCallback) {
        console.info('Getting token from ' + url);

        $.ajax({
            url: url + '?backendId=' + Vodafone.Configuration.getConfiguration().backendId,
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            crossDomain: true,
            headers: function () {
                var headers = Vodafone.Trace.getHeaders();
                headers.backendScopes = 'seamless_id_user_details_acr_static';
                if (DIRECT) {
                    headers['x-sdp-msisdn'] = data.msisdn;
                    headers['x-intp-opco'] = data.market;
                } else {
                    headers.Authorization = Vodafone.Apix.getAppToken();
                }
                return headers;
            }(),
            success: function (data, status, xhr) {
                console.debug(xhr.getAllResponseHeaders());
                console.debug(xhr.getResponseHeader('Location'));
                if (data) {
                    console.debug('Received token data ' + JSON.stringify(data));
                    successCallback(new Vodafone.Result(Vodafone.Result.codes.TOKEN_CREATED, null, data));
                } else if (xhr.getResponseHeader('Location')) {
                    console.debug('OTP validation required, location is ' + xhr.getResponseHeader('Location'));
                    generateCode(xhr.getResponseHeader('Location'), successCallback, errorCallback);
                } else {
                    console.debug('Error parsing token data ' + JSON.stringify(data));
                    errorCallback(new Vodafone.Result(Vodafone.Result.codes.INVALID_DATA, null, null));
                }
            },
            error: function (request, status, error) {
                var message = 'Error occurred while getting token from ' + url +
                    ', status: ' + status +
                    ', error: ' + error;

                console.error(message);
                errorCallback(new Vodafone.Result(Vodafone.Result.codes.ERROR, message, null));
            }
        });
    };

    var generateCode = function (confirmUrl, successCallback, errorCallback) {
        Vodafone.Storage.set(Vodafone.Configuration.getConfiguration().tokenConfirmUrlKey, confirmUrl);

        $.ajax({
            url: Vodafone.Configuration.getConfiguration().apixBaseUrl + confirmUrl,
            type: 'GET',
            headers: function () {
                var headers = Vodafone.Trace.getHeaders();
                if (!DIRECT) {
                    headers.Authorization = Vodafone.Apix.getAppToken();
                }
                return headers;
            }(),
            success: function () {
                if (successCallback) {
                    successCallback(new Vodafone.Result(Vodafone.Result.codes.OTP_SMS_SENT, null, null));
                }
            },
            error: function (request, status, error) {
                var message = 'Error occurred while getting token from ' + confirmUrl +
                    ', status: ' + status +
                    ', error: ' + error;

                console.error(message);
                if (errorCallback) {
                    errorCallback(new Vodafone.Result(Vodafone.Result.codes.ERROR, message, null));
                }
            }
        });
    };

    var confirmCode = function (code, successCallback, errorCallback) {
        var confirmUrl = Vodafone.Storage.get(Vodafone.Configuration.getConfiguration().tokenConfirmUrlKey);

        var absoluteConfirmationUrl = Vodafone.Configuration.getConfiguration().apixBaseUrl + confirmUrl;
        console.info("Sending confirmation code '" +code+ "' to " + absoluteConfirmationUrl);
        $.ajax({
            url: absoluteConfirmationUrl,
            type: 'POST',
            data: JSON.stringify({
                code: code
            }),
            contentType: 'application/json',
            headers: function () {
                var headers = Vodafone.Trace.getHeaders();
                if (!DIRECT) {
                    headers.Authorization = Vodafone.Apix.getAppToken();
                }
                return headers;
            }(),
            success: function (data) {
                if (data) {
                    console.debug('Received token data ' + JSON.stringify(data));
                    successCallback(new Vodafone.Result(Vodafone.Result.codes.TOKEN_CREATED, null, data));
                } else {
                    errorCallback(new Vodafone.Result(Vodafone.Result.codes.INVALID_DATA, null, null));
                }
            },
            error: function (request, status, error) {
                var message = 'Error occurred while sending code to ' + confirmUrl +
                    ', status: ' + status +
                    ', error: ' + error;

                console.error(message);
                if (errorCallback) {
                    errorCallback(new Vodafone.Result(Vodafone.Result.codes.ERROR, message, null));
                }
            }
        });
    };

    return {
        get: get,
        confirm: confirmCode
    };
}();

Vodafone.Storage = function () {
    var store = new Persist.Store('js-sdk');

    var key = CryptoJS.enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
    var iv = CryptoJS.enc.Hex.parse("101112131415161718191a1b1c1d1e1f");

    var set = function (name, value) {
        if (name && value) {
            var encryptedValue = _encrypt(value.toString());

            console.debug("Storing '" +name+ "', '" +value+ "', '" +encryptedValue+ "'");
            store.set(name, encryptedValue);
        } else {
            console.warning("Did not set anything for " + name + " and " + value);
        }
    };

    var get = function (name) {
        var encryptedValue = store.get(name);
        var value;

        if (encryptedValue) {
            value = _decrypt(encryptedValue);
        }

        console.debug("Retrieving '" +name+ "', '" +value+ "', '" +encryptedValue+ "'");
        return value;
    };

    var _encrypt = function (plain) {
        console.debug("Encrypting '" + plain + "'");
        var encrypted = CryptoJS.AES.encrypt(plain, key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }).toString();
        console.debug("Encrypted to '" +encrypted+ "'");
        return  encrypted;
    };

    var _decrypt = function (encrypted) {
        console.debug("Decrypting '" +encrypted+ "'");
        var plain = CryptoJS.AES.decrypt(encrypted, key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }).toString(CryptoJS.enc.Utf8);
        console.debug("Decrypted to '" +plain+ "'");
        return  plain;
    };

    return {
        set: set,
        get: get
    };
}();

Vodafone.MSISDN = function(value) {
    var shortValue = '';
    var countryCode = '';
    var phonePrefix = '';
    var error = '';

    var MSISDN = function(value) {
        console.debug("Creating a new MSISDN for " + value);

        if (value.indexOf('+') === 0 ) {
            value = value.substring(1, value.length-1);
        }
        value = parseInt(value).toString();

        $.each(Vodafone.Configuration.getConfiguration().availableMarkets, function(cc, pp) {
            if (value.indexOf(pp) === 0) {
                console.info("Got " + cc + " for MSISDN " + value);
                countryCode = cc;
                phonePrefix = pp.toString();
                return false; //break
            }
        });

        var ppLength = phonePrefix.length;
        if (ppLength > 0) {
            shortValue = value.substring(ppLength, value.length);
        }

        console.debug("Created MSISDN. SV: " + shortValue + " CC: " + countryCode + " PP: " + phonePrefix);
    }(value);

    this.isValid = function() {
        if (countryCode === '') {
            error = "Country not supported";
            return false;
        }

        var re = new RegExp(Vodafone.Configuration.getConfiguration().phoneNumberRegex);

        if (re.exec(shortValue)) {
            return true;
        }

        error = "Provided MSISDN has a wrong format";
        return false;
    };

    this.getError = function() {
        return error;
    };

    this.getCountryCode = function() {
        return countryCode;
    };

    this.getValue = function() {
        return phonePrefix + shortValue;
    };
};


Vodafone.Result = function (code, message, data) {
    this.code = code;
    this.message = message;
    this.data = data;
};

Vodafone.Result.codes = {
    ERROR: 'ERROR',
    INITIALIZED: 'Initialized',
    UNABLE_TO_RESOLVE: 'Unable to resolve',

    IMPROPERLY_CONFIGURED: 'IMPROPERLY_CONFIGURED',
    THROTTLING_EXCEEDED: 'THROTTLING_EXCEEDED',
    INVALID_DATA: 'INVALID_DATA',
    INVALID_MSISDN: 'INVALID_MSISDN',
    NO_MSISDN_UNDER_HTTPS: 'NO_MSISDN_UNDER_HTTPS',
    TOKEN_CREATED: 'VDFResolutionStatusCompleted',
    OTP_SMS_SENT: 'OTP_SMS_SENT'
};
