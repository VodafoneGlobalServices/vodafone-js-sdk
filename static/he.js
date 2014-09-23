HE = window.HE || {};

HE = function() {
    var options = {
        configurationUrl: 'http://127.0.0.1:5000/configuration/'
    };

    var init = function (options_) {
        for (var key in options_) {
            options[key] = options_[key];
        }

        getSdkConfig();

        console.debug('SDK initialized with options: ' + JSON.stringify(options))

        return this;
    };

    var getToken = function (userData, successCallback, errorCallback) {
        HE.Throttling.incrementCounter();

        try {
            HE.Token.get(userData, successCallback, errorCallback);
        } catch (err) {
            errorCallback(err);
        }
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
            HE.checkConfig(['apixAuthUrl', 'apixGrantType', 'apixClientId', 'apixClientSecret', 'apixScope']);

            $.ajax({
                url: HE.getConfig().apixAuthUrl,
                type: 'POST',
                async: false,
                data: 'grant_type=' + HE.getConfig().apixGrantType +
                    '&client_id=' + HE.getConfig().apixClientId +
                    '&client_secret=' + HE.getConfig().apixClientSecret +
                    '&scope=' + HE.getConfig().apixScope,
                headers: HE.Trace.getHeaders(),
                success: function(data) {
                    console.debug('Received apix auth data ' + JSON.stringify(data));
                    appToken = data.access_token;
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
        if ($.cookie(HE.getConfig().browserIdCookieName)) {
            return $.cookie(HE.getConfig().browserIdCookieName);
        } else {
            $.cookie(
                HE.getConfig().browserIdCookieName,
                fingerprint,
                { expires: HE.getConfig().browserIdCookieExpirationDays }
            );

            return fingerprint;
        }
    };

    var getUserCountry = function() {
        return window.navigator.language;
    };

    var getTransactionId = function() {
        return CryptoJS.MD5((fingerprint + new Date().getMilliseconds()).toString());
    };

    var getHeaders = function() {
        var headers = {
            'x-vf-trace-subject-region': getUserCountry(),
            'x-vf-trace-source': HE.getConfig().sdkId + '-' + HE.getConfig().applicationId,
            'x-vf-trace-transaction-id': getTransactionId()
        };

        if (HE.getConfig().cookiesAllowed) {
            headers['x-vf-trace-subject-id'] = getBrowserId();
        }

        return headers;
    };

    return {
        getHeaders: getHeaders
    };
}();

HE.Token = function() {
    var get = function (msisdn, successCallback, errorCallback) {
        if (window.location.hash) {
            console.info('Retrieving data from anchor');

            var data = JSON.parse(window.location.hash.substring(1));

            console.debug('Retrieved data from anchor ' + window.location.hash.substring(1));

            window.location.hash = '';

            successCallback(data);
        } else {
            console.debug('Could not find data neither in local storage nor in anchor');

            var protocol = window.location.protocol;

            console.debug('Protocol is ' + protocol);

            if (protocol === 'https:') {
                redirectToHttp();
            } else {
                HE.checkConfig(['resolveUserUrl']);

                console.info('Getting user details from ' + HE.getConfig().resolveUserUrl);

                $.ajax({
                    url: HE.getConfig().resolveUserUrl,
                    type: 'POST',
                    data: setUpPostData(msisdn),
                    dataType: 'json',
                    contentType: 'application/json',
                    crossDomain: true,
                    headers: setUpHeaders(),
                    success: function (data) {
                        console.debug('Received user data ' + JSON.stringify(data));

                        if (successCallback) {
                            successCallback(data);
                        }
                    },
                    error: function (request, status, error) {
                        console.error('Error occurred while getting user details from ' + HE.getConfig().resolveUserUrl +
                            ', status: ' + status +
                            ', error: ' + error);

                        if (errorCallback) {
                            errorCallback(error);
                        }
                    }
                });
            }
        }
    };

    var redirectToHttp = function() {
        HE.checkConfig(['httpHostedPage', 'redirectUrl']);

        console.info('Redirecting to http page at ' + HE.getConfig().httpHostedPage);

        window.location = HE.getConfig().httpHostedPage + '?redirectUrl=' + HE.getConfig().redirectUrl;
    };

    var setUpHeaders = function () {
        var headers = HE.Trace.getHeaders();
        headers['Authorization'] = 'Bearer' + HE.Apix.getAppToken();
        headers['backendScopes'] = 'seamless_id_user_details_acr_static';

        return headers;
    };

    var setUpPostData = function (msisdn) {
        var data = {};

        if (msisdn) {
            if (msisdnValid(msisdn)) {
                data['msisdn'] = msisdn;
                data['market'] = getMarket(msisdn);
                data['smsValidation'] = true;
            } else {
                throw new Error('MSISDN invalid');
            }
        }

        return JSON.stringify(data);
    };

    var msisdnValid = function(msisdn) {
//        TODO implement it (based on constraints from the configuration service)
        return false;
    };

    var getMarket = function(msisdn) {
//        TODO implement it (based on the configuration service)
        return 'DE';
    };

    return {
        get: get
    };
}();