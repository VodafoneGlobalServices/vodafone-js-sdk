HE = window.HE || {};

HE = function() {
    var options = {
        sdkId: 'js-sdk',
        applicationId: null,
        resolveUserUrl: null,
        httpHostedPage: null,
        redirectUrl: null,
        localStorageKey: 'userDetail',
        cookiesAllowed: false,
        browserIdCookieName: 'browserId',
        browserIdCookieExpirationDays: 10*365,
        apixAuthUrl: 'https://apisit.developer.vodafone.com/2/oauth/access-token',
        apixGrantType: 'client_credentials',
        apixClientId: 'I1OpZaPfBcI378Bt7PBhQySW5Setb8eb',
        apixClientSecret: 'k4l1RXZGqMnw2cD8',
        apixScope: 'SSO_OAUTH2_INPUT'
    };

    var fingerprint = new Fingerprint().get();

    var apixAuthToken;

    var getAuthToken = function() {
        $.ajax({
            url: options.apixAuthUrl,
            type: 'POST',
            async: false,
            data: 'grant_type=' + options.apixGrantType +
                '&client_id=' + options.apixClientId +
                '&client_secret=' + options.apixClientSecret +
                '&scope=' + options.apixScope,
            beforeSend: function(request) {
                setTraceHeaders(request);
            },
            success: function(data) {
                console.debug('Received apix auth data ' + JSON.stringify(data));
                apixAuthToken = data.access_token;
                console.info('Set the apix token to ' + apixAuthToken);
            },
            error: function (request, status, error) {
                console.error('Error occurred while getting authentication token at ' + options.apixAuthUrl +
                    ', status: ' + status +
                    ', error: ' + error);
            }
        });
    };

    var init = function (options_) {
        for (var key in options_) {
            options[key] = options_[key];
        }

        console.debug('SDK initialized with options: ' + JSON.stringify(options))

        if (!apixAuthToken) {
            getAuthToken();
        }

        return this;
    };

    var resolveUser = function (successCallback, errorCallback) {
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
                console.info('Getting user details from ' + options.resolveUserUrl);

                $.ajax({
                    url: options.resolveUserUrl,
                    type: 'POST',
                    datatype: 'json',
                    beforeSend: function (request) {
                        setTraceHeaders(request);
                        request.setRequestHeader('Authorization', 'Bearer' + apixAuthToken);
                    },
                    success: function(data) {
                        console.debug('Received user data ' + JSON.stringify(data));

                        if (successCallback) {
                            successCallback(data);
                        }
                    },
                    error: function (request, status, error) {
                        console.error('Error occurred while getting user details from ' + options.resolveUserUrl +
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
        console.info('Redirecting to http page at ' + options.httpHostedPage);

        window.location = options.httpHostedPage + '?redirectUrl=' + options.redirectUrl;
    };

    var getBrowserId = function() {
        if ($.cookie(options.browserIdCookieName)) {
            return $.cookie(options.browserIdCookieName);
        } else {
            $.cookie(
                options.browserIdCookieName,
                fingerprint,
                { expires: options.browserIdCookieExpirationDays }
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

    var setTraceHeaders = function(request) {
        if (options.cookiesAllowed) {
            request.setRequestHeader('x-vf-trace-subject-id', getBrowserId());
        }

        request.setRequestHeader('x-vf-trace-subject-region', getUserCountry());
        request.setRequestHeader('x-vf-trace-source', options.sdkId + '-' + options.applicationId);
        request.setRequestHeader('x-vf-trace-transaction-id', getTransactionId());
    };

    return {
        init: init,
        resolveUser: resolveUser
    };
}();