HE = window.HE || {};

HE = (function () {
    var init = function (mOptions, mInitCallback) {
        if (HE.Configuration.isInitialized() && HE.Apix.isIntialized()) {
            console.info("Already initialized.");
            mInitCallback(new HE.Result(HE.Result.codes.INITIALIZED, undefined, undefined));
            return;
        }

        try {
            HE.Configuration.init(mOptions, function(result) {
                if (result.code === HE.Result.codes.INITIALIZED) {
                    HE.Apix.init(mInitCallback);
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
            HE.Throttling.incrementCounter();
            HE.Token.get(msisdn, successCallback, errorCallback);
        } catch (e) {
            errorCallback(new HE.Result(HE.Result.codes.ERROR, e.message, undefined));
        }
    };

    var confirmToken = function (code, successCallback, errorCallback) {
        try {
            _checkInitialization();
            if (code === undefined) {
                throw new Error("The 'code' parameter is mandatory");
            }
            HE.Throttling.incrementCounter();
            HE.Token.confirm(code, successCallback, errorCallback);
        } catch (e) {
            errorCallback(new HE.Result(HE.Result.codes.ERROR, e.message, undefined));
        }
    };

    var _checkInitialization = function () {
        if (!HE.Configuration.isInitialized()) {
            throw new Error("SDK not initialized");
        }
    };

    return {
        init: init,
        getToken: getToken,
        confirmToken: confirmToken
    };
})();

HE.Configuration = function() {
    var initialized = false;
    var configuration = {};

    var init = function (mOptions, mInitCallback) {
        console.debug("init");
        console.debug(JSON.stringify(mOptions, undefined, 2));

        if (initialized) {
            console.info("Already initialized.");
            mInitCallback(new HE.Result(HE.Result.codes.INITIALIZED, undefined, undefined));
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

    var getProperty = function(property, defaultValue) {
        //FIXME: check the string before eval as it can be a security issue
        var value = eval("configuration." + property); // jshint ignore:line
        if (value === undefined) {
            if (defaultValue === undefined) {
                console.error("Property " + property + " is undefined");
                throw new Error('Improperly configured - ' + property + ' is not defined');
            } else {
                value = defaultValue;
            }
        }

        console.debug("configuration[" +property+ "]=" + value);
        return  value;
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

                mInitCallback(new HE.Result(HE.Result.codes.INITIALIZED, "SDK configuration initialized", data));
            },
            error: function (request, status, error) {
                var errorData = {
                    configUrl: configuration.configurationUrl,
                    status: status,
                    error: error
                };
                mInitCallback(new HE.Result(HE.Result.codes.ERROR, "Error while retrieving configuration", errorData));
            }
        });
    };

    var _calculateCompoundProperties = function() {
        configuration.hapResolveAbsoluteUrl = configuration.hap.protocol + "://" + configuration.hap.host + configuration.basePath;
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
        getProperty: getProperty,
        isInitialized: isInitialized
    };
}();

HE.Apix = function () {
    var appToken;
    var initialized = false;

    var init = function(mInitCallback) {
        console.debug("oAuth token NOT set. Retrieving it from APIX");
        var apixAuthUrl = HE.Configuration.getProperty("apixAuthAbsoluteUrl");
        $.ajax({
            url: apixAuthUrl,
            type: 'POST',
            //FIXME: use callbacks instead of async: false which is not supported for cross domain requests.
//                async: false,
            data: 'grant_type=' + HE.Configuration.getProperty("apix.oAuthTokenGrantType") +
                '&client_id=' + HE.Configuration.getProperty("clientAppKey") +
                '&client_secret=' + HE.Configuration.getProperty("clientAppSecret") +
                '&scope=' + HE.Configuration.getProperty("apix.oAuthTokenScope"),
            success: function (data) {
                console.debug('Received apix auth data ' + JSON.stringify(data));
                appToken = data.token_type + data.access_token;
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

HE.Throttling = function () {
    var incrementCounter = function () {
        var throttlingValue = parseInt(HE.Storage.get(HE.Configuration.getProperty("throttlingCookieName")), 10);
        var throttlingExpiration = new Date(HE.Storage.get(HE.Configuration.getProperty("throttlingCookieExpirationName")));

        if (throttlingValue && throttlingExpiration && new Date() < throttlingExpiration) {
            if (throttlingValue >= HE.Configuration.getProperty("requestsThrottlingLimit")) {
                throw new Error('Throttling exceeded');
            } else {
                HE.Storage.set(HE.Configuration.getProperty("throttlingCookieName"), throttlingValue + 1);
            }
        } else {
            var date = new Date();
            date.setTime(date.getTime() + (HE.Configuration.getProperty("requestsThrottlingPeriod") * 1000));
            HE.Storage.set(HE.Configuration.getProperty("throttlingCookieName"), 1);
            HE.Storage.set(HE.Configuration.getProperty("throttlingCookieExpirationName"), date);
        }
    };

    return {
        incrementCounter: incrementCounter
    };
}();

HE.Trace = function () {
    var fingerprint = new Fingerprint();
    var parser = new UAParser();

    var getSubjectId = function () {
        if (HE.Configuration.getProperty("cookiesAllowed")) {
            if (!HE.Storage.get(HE.Configuration.getProperty("subjectIdCookieName"))) {
                HE.Storage.set(
                    HE.Configuration.getProperty("subjectIdCookieName"),
                        parser.getOS().name + ' ' + parser.getOS().version + ' \\ ' +
                        parser.getBrowser().name + ' ' + parser.getBrowser().version + ' \\ ' +
                        fingerprint.get()
                );
            }

            return HE.Storage.get(HE.Configuration.getProperty("subjectIdCookieName"));
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
            'x-vf-trace-source': HE.Configuration.getProperty("sdkId") + '-' + HE.Configuration.getProperty("clientAppKey"),
            'x-vf-trace-transaction-id': getTransactionId(),
            'x-vf-trace-subject-id': getSubjectId()
        };
    };

    return {
        getHeaders: getHeaders
    };
}();

HE.Token = function () {
    var get = function (msisdn, successCallback, errorCallback) {
        if (msisdn) {
            if (msisdnValid(msisdn)) {
                _callApix(msisdn, successCallback, errorCallback);
            } else {
                errorCallback(new HE.Result(HE.Result.codes.INVALID_MSISDN, null, null));
            }
        } else {
            var protocol = window.location.protocol;

            console.debug('Protocol is ' + protocol);

            if (protocol === 'http:') {
                _callHap(successCallback, errorCallback);
            } else {
                errorCallback(new HE.Result(HE.Result.codes.NO_MSISDN_UNDER_HTTPS,
                    "MSISDN was not provided - cannot get token under https protocol", null));
            }
        }
    };

    var _callHap = function (successCallback, errorCallback) {
        _callResolver(
            HE.Configuration.getProperty("hapResolveAbsoluteUrl"),
            {},
            successCallback, errorCallback
        );
    };

    var _callApix = function (msisdn, successCallback, errorCallback) {
        _callResolver(
            HE.Configuration.getProperty("apixResolveAbsoluteUrl"),
            {
                msisdn: msisdn,
                market: _getMarket(msisdn)
            },
            successCallback, errorCallback
        );
    };

    var _callResolver = function (url, data, successCallback, errorCallback) {
        console.info('Getting token from ' + url);

        $.ajax({
            url: url + '?backendId=' + HE.Configuration.getProperty("backendId"),
            type: 'POST',
            data: JSON.stringify(data),
            contentType: 'application/json',
            crossDomain: true,
            headers: function () {
                var headers = HE.Trace.getHeaders();
                headers.backendScopes = 'seamless_id_user_details_acr_static';
                if (DIRECT) {
                    headers['x-sdp-msisdn'] = data.msisdn;
                    headers['x-intp-opco'] = data.market;
                } else {
                    headers.Authorization = HE.Apix.getAppToken();
                }
                return headers;
            }(),
            success: function (data, status, xhr) {
                console.debug(xhr.getAllResponseHeaders());
                console.debug(xhr.getResponseHeader('Location'));
                if (data) {
                    console.debug('Received token data ' + JSON.stringify(data));
                    successCallback(new HE.Result(HE.Result.codes.TOKEN_CREATED, null, data));
                } else if (xhr.getResponseHeader('Location')) {
                    console.debug('OTP validation required, location is ' + xhr.getResponseHeader('Location'));
                    generateCode(xhr.getResponseHeader('Location'), successCallback, errorCallback);
                } else {
                    console.debug('Error parsing token data ' + JSON.stringify(data));
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

    var generateCode = function (confirmUrl, successCallback, errorCallback) {
        HE.Storage.set(HE.Configuration.getProperty("tokenConfirmUrlKey"), confirmUrl);

        $.ajax({
            url: HE.Configuration.getProperty("apixBaseUrl") + confirmUrl,
            type: 'GET',
            headers: function () {
                var headers = HE.Trace.getHeaders();
                if (!DIRECT) {
                    headers.Authorization = HE.Apix.getAppToken();
                }
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

    var confirmCode = function (code, successCallback, errorCallback) {
        var confirmUrl = HE.Storage.get(HE.Configuration.getProperty("tokenConfirmUrlKey"));

        var absoluteConfirmationUrl = HE.Configuration.getProperty("apixBaseUrl") + confirmUrl;
        console.info("Sending confirmation code '" +code+ "' to " + absoluteConfirmationUrl);
        $.ajax({
            url: absoluteConfirmationUrl,
            type: 'POST',
            data: JSON.stringify({
                code: code
            }),
            contentType: 'application/json',
            headers: function () {
                var headers = HE.Trace.getHeaders();
                if (!DIRECT) {
                    headers.Authorization = HE.Apix.getAppToken();
                }
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

    var msisdnValid = function (msisdn) {
        var re = new RegExp(HE.Configuration.getProperty("phoneNumberRegex"));

        if (re.exec(msisdn)) {
            return true;
        }

        return false;
    };

    var _getMarket = function (msisdn) {
        //FIXME: check the length before invoking substring
        var countryPrefix = msisdn.substring(0, 2);
        var toReturn;
        $.each(HE.Configuration.getProperty("availableMarkets"), function(countryCode, phonePrefix) {
            console.debug("Comparing " + countryPrefix + " with " + countryCode);
            if (phonePrefix == countryPrefix) {
                console.info("Got " + countryCode + " for MSISDN " + msisdn);
                toReturn = countryCode;
                return false;
            }
        });
        if (toReturn === undefined) {
            console.error("Could not extract countryCode from MSISDN: " + msisdn);
        }
        return toReturn;
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
        return plain;
//
//        console.debug("Encrypting '" + plain + "'");
//        var encrypted = CryptoJS.AES.encrypt(plain, key,
//            {
//                iv: iv,
//                mode: CryptoJS.mode.CBC,
//                padding: CryptoJS.pad.Pkcs7
//            }).toString();
//        console.debug("Encrypted to '" +encrypted+ "'");
//        return  encrypted;
    };

    var _decrypt = function (encrypted) {
        return encrypted;
//
//        console.debug("Decrypting '" +encrypted+ "'");
//        var plain = CryptoJS.AES.decrypt(encrypted, key,
//            {
//                iv: iv,
//                mode: CryptoJS.mode.CBC,
//                padding: CryptoJS.pad.Pkcs7
//            }).toString(CryptoJS.enc.Utf8);
//        console.debug("Decrypted to '" +plain+ "'");
//        return  plain;
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
