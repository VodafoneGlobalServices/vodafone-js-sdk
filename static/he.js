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
        browserIdCookieExpirationDays: 10*365
    };

    var storage = new Persist.Store('he');

    var init = function (options_) {
        for (var key in options_) {
            options[key] = options_[key];
        }

        return this;
    };

    var resolveUser = function (callback) {
        if (storage.get(options.localStorageKey)) {
            console.log('Retrieving data from local storage');

            callback(JSON.parse(storage.get('userDetail')));
        } else if (window.location.hash) {
            console.log('Retrieving data from anchor');

            var data = JSON.parse(window.location.hash.substring(1));

            window.location.hash = '';

            storeUserData(storage, data);

            callback(data);
        } else {
            console.log('Could not find data neither in local storage nor in anchor');

            var protocol = window.location.protocol;

            console.log('Protocol is ' + protocol);

            if (protocol === 'https:') {
                redirectToHttp();
            } else {
                console.log('Getting user details from ' + options.resolveUserUrl);

                $.ajax({
                    url: options.resolveUserUrl,
                    type: 'POST',
                    datatype: 'json',
                    beforeSend: function (request) {
                        if (options.cookiesAllowed) {
                            request.setRequestHeader('x-vf-trace-subject-id', getBrowserId());
                        }

                        request.setRequestHeader('x-vf-trace-subject-region', getUserRegion());
                        request.setRequestHeader('x-vf-trace-source', options.sdkId + '-' + options.applicationId);
                        request.setRequestHeader('x-vf-trace-transaction-id', getTransactionId());
                    },
                    success: function(data) {
                        console.log('Received user data ' + JSON.stringify(data));

                        storeUserData(storage, data);

                        if (callback) {
                            callback(data);
                        }
                    }
                });
            }
        }
    };

    var redirectToHttp = function() {
        console.log('Redirecting to http page at ' + options.httpHostedPage);

        window.location = options.httpHostedPage + '?redirectUrl=' + options.redirectUrl;
    };

    var storeUserData = function(storage, data) {
        storage.set(options.localStorageKey, JSON.stringify(data));
    };

    var getBrowserId = function() {
        if ($.cookie(options.browserIdCookieName)) {
            return $.cookie(options.browserIdCookieName);
        } else {
            $.cookie(
                options.browserIdCookieName,
                CryptoJS.MD5(new Date().getMilliseconds().toString()),
                { expires: options.browserIdCookieExpirationDays });
        }
    };

    var getUserRegion = function() {
        return 'dummy';
    };

    var getTransactionId = function() {
        return 'dummy';
    };

    return {
        init: init,
        resolveUser: resolveUser
    };
}();