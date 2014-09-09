HE = window.HE || {};

HE = function() {
    var options = {
        resolveUserUrl: null,
        httpHostedPage: null,
        redirectUrl: null
    };

    var storage = new Persist.Store('he');

    var init = function (options_) {
        for (var key in options_) {
            options[key] = options_[key];
        }

        return this;
    };

    var getUserDetail = function (callback) {
        if (storage.get('userDetail')) {
            console.log('Retrieving data from local storage');

            callback(JSON.parse(storage.get('userDetail')));
        } else if (window.location.hash) {
            console.log('Retrieving data from anchor');

            var data = JSON.parse(window.location.hash.substring(1));

            window.location.hash = '';

            _storeUserData(storage, data);

            callback(data);
        } else {
            console.log('Could not find data neither in local storage nor in anchor');

            var protocol = window.location.protocol;

            console.log('Protocol is ' + protocol);

            if (protocol === 'https:') {
                _redirectToHttp();
            } else {
                console.log('Getting user details from ' + options.resolveUserUrl);

                $.ajax({
                    type: 'GET',
                    async: false,
                    url: options.resolveUserUrl,
                    success: function (data, textStatus, request) {
                        console.log('Received user data ' + JSON.stringify(data));

                        _storeUserData(storage, data);

                        if (callback) {
                            callback(data);
                        }
                    }
                });
            }
        }
    };

    var _redirectToHttp = function() {
        console.log('Redirecting to http page at ' + options.httpHostedPage);

        window.location = options.httpHostedPage + '?redirectUrl=' + options.redirectUrl;
    };

    var _storeUserData = function(storage, data) {
        if (_isUserDataValid(data)) {
            storage.set('userDetail', JSON.stringify(data));
        }
    };

    var _isUserDataValid = function(data) {
        if (data.msisdn) {
            return true;
        }

        return false;
    };

    return {
        init: init,
        getUserDetail: getUserDetail
    };
}();