HE = window.HE || {};

HE = function() {
    var options = {
        configurationUrl: '//127.0.0.1/configuration/'
    };

    var init = function (options_) {
        for (var key in options_) {
            options[key] = options_[key];
        }

        getSdkConfig();

        console.debug('SDK initialized with options: ' + JSON.stringify(options))

        return this;
    };

    var getToken = function (msisdn, successCallback, errorCallback) {
        HE.Throttling.incrementCounter();
        HE.Token.get(msisdn, successCallback, errorCallback);
    };

    var getSdkConfig = function() {
        checkConfig(['configurationUrl']);

        $.ajax({
            url: options.configurationUrl,
            type: 'GET',
            async: false,
            headers: HE.Trace.getHeaders(),
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
            return options[element] != undefined;
        })) {
            throw new Error('Improperly configured - ' + mandatoryOptions + ' are mandatory');
        };
    };

    var getConfig = function () {
        return options;
    };

    return {
        init: init,
        getToken: getToken,
        getConfig: getConfig,
        checkConfig: checkConfig
    };
}();

HE.Apix = function() {
    var appToken;

    var getAppToken = function() {
        if (appToken) {
            return appToken
        } else {
            HE.checkConfig(['apixAuthUrl', 'apixGrantType', 'clientAppKey', 'clientAppSecret', 'apixScope']);

            $.ajax({
                url: HE.getConfig().apixAuthUrl,
                type: 'POST',
                async: false,
                data: 'grant_type=' + HE.getConfig().apixGrantType +
                    '&client_id=' + HE.getConfig().clientAppKey +
                    '&client_secret=' + HE.getConfig().clientAppSecret +
                    '&scope=' + HE.getConfig().apixScope,
                headers: HE.Trace.getHeaders(),
                success: function(data) {
                    console.debug('Received apix auth data ' + JSON.stringify(data));
                    appToken = data.token_type + data.access_token;
                    console.info('Set the apix token to ' + appToken);
                },
                error: function (request, status, error) {
                    console.error('Error occurred while getting authentication token at ' + HE.getConfig().apixAuthUrl +
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

HE.Throttling = function() {
   var incrementCounter = function() {
        if ($.cookie(HE.getConfig().throttlingCookieName) && $.cookie(HE.getConfig().throttlingCookieExpirationName)
            && new Date() < new Date($.cookie(HE.getConfig().throttlingCookieExpirationName))) {

            var throttlingValue = $.cookie(HE.getConfig().throttlingCookieName, Number);

            if (throttlingValue >= HE.getConfig().throttlingPerPeriodLimit) {
                throw new Error('Throttling exceeded');
            } else {
                $.cookie(HE.getConfig().throttlingCookieName, throttlingValue + 1);
            }
        } else {
            var date = new Date();
            date.setTime(date.getTime() + (HE.getConfig().throttlingPeriodMinutes * 60 * 1000));
            $.cookie(HE.getConfig().throttlingCookieName, 1);
            $.cookie(HE.getConfig().throttlingCookieExpirationName, date);
        }
    };

    return {
        incrementCounter: incrementCounter
    };
}();

HE.Trace = function() {
    var fingerprint = new Fingerprint().get();

    var getBrowserId = function() {
        if (HE.getConfig().cookiesAllowed) {
            if ($.cookie(HE.getConfig().browserIdCookieName)) {
                return $.cookie(HE.getConfig().browserIdCookieName);
            } else {
                $.cookie(
                    HE.getConfig().browserIdCookieName,
                    fingerprint,
                    { expires: HE.getConfig().browserIdCookieExpirationDays }
                );
            }
        }

        return fingerprint;
    };

    var getUserCountry = function() {
        return window.navigator.language.substr(3, 5);
    };

    var getTransactionId = function() {
        return CryptoJS.MD5((fingerprint + new Date().getMilliseconds()).toString());
    };

    var getHeaders = function() {
        return {
            'x-vf-trace-subject-region': getUserCountry(),
            'x-vf-trace-source': HE.getConfig().sdkId + '-' + HE.getConfig().applicationId,
            'x-vf-trace-transaction-id': getTransactionId(),
            'x-vf-trace-subject-id': getBrowserId()
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
                errorCallback("MSISDN invalid");
            }
        } else {
            var protocol = window.location.protocol;

            console.debug('Protocol is ' + protocol);

            if (protocol === 'http:') {
                callHap(successCallback, errorCallback);
            } else {
                errorCallback("MSISDN was not provided - cannot get token under https protocol");
            }
        }
    };

    var callHap = function (successCallback, errorCallback) {
        HE.checkConfig(['hapResolveUrl']);

        callResolver(
            HE.getConfig().hapResolveUrl,
            JSON.stringify({}),
            successCallback, errorCallback
        );
    };

    var callApix = function (msisdn, successCallback, errorCallback) {
        HE.checkConfig(['apixResolveUrl']);

        callResolver(
            HE.getConfig().apixResolveUrl,
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
            url: url + '?backendId=' + HE.getConfig().applicationId,
            type: 'POST',
            data: data,
            dataType: 'json',
            contentType: 'application/json',
            crossDomain: true,
            headers: function() {
                var headers = HE.Trace.getHeaders();
                headers['Authorization'] = HE.Apix.getAppToken();
                headers['backendScopes'] = 'seamless_id_user_details_acr_static';
                return headers;
            }(),
            success: function (data) {
                console.debug('Received token ' + JSON.stringify(data));

                if (successCallback) {
                    successCallback(data);
                }
            },
            error: function (request, status, error) {
                console.error('Error occurred while getting token from ' + url +
                    ', status: ' + status +
                    ', error: ' + error);

                if (errorCallback) {
                    errorCallback(error);
                }
            }
        });
    };

    var msisdnValid = function(msisdn) {
        var re = new RegExp(HE.getConfig().msisdnValidationPattern);

        if (re.exec(msisdn)) {
            return true;
        }

        return false;
    };

    var getMarket = function(msisdn) {
        var countryCode = msisdn.substring(0, 2);
        return HE.getConfig().markets[countryCode];
    };

    return {
        get: get
    };
}();