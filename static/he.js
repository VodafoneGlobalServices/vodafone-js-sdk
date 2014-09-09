HE = window.HE || {};

HE = function() {
    var options = {
        resolveUserUrl: null,
        httpHostedPage: null,
        redirectUrl: null,
        localStorageKey: 'userDetail'
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

                $.getJSON(options.resolveUserUrl, function(data) {
                    console.log('Received user data ' + JSON.stringify(data));

                    storeUserData(storage, data);

                    if (callback) {
                        callback(data);
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

    return {
        init: init,
        resolveUser: resolveUser
    };
}();