var HE = {
    options: {
        resolveUserUrl: null,
        httpHostedPage: null,
        redirectUrl: null
    },

    init: function (options) {
        for (var key in options) {
            this.options[key] = options[key];
        }

        this.storage = new Persist.Store('he');

        return this;
    },

    getUserDetail: function (callback) {
        if (this.storage.get('userDetail')) {
            console.log('Retrieving data from local storage');

            callback(JSON.parse(this.storage.get('userDetail')));
        } else if (window.location.hash) {
            console.log('Retriving data from anchor');

            var data = JSON.parse(window.location.hash.substring(1));

            window.location.hash = '';

            this._storeUserData(this.storage, data);

            callback(data);
        } else {
            console.log('Could not find data neither in local storage nor in anchor');

            var protocol = window.location.protocol;

            console.log('Protocol is ' + protocol);

            if (protocol === 'https:') {
                this._redirectToHttp();
            } else {
                console.log('Getting user details from ' + this.options.resolveUserUrl);

                var _this = this;

                $.ajax({
                    type: 'GET',
                    async: false,
                    url: this.options.resolveUserUrl,
                    success: function (data, textStatus, request) {
                        _this._storeUserData(_this.storage, data);

                        if (callback) {
                            callback(data);
                        }
                    }
                });
            }
        }
    },

    _redirectToHttp: function() {
        console.log('Redirecting to http page at ' + this.options.httpHostedPage);

        window.location = this.options.httpHostedPage + '?redirectUrl=' + this.options.redirectUrl;
    },

    _storeUserData: function(storage, data) {
        if (this._isUserDataValid(data)) {
            storage.set('userDetail', JSON.stringify(data));
        }
    },

    _isUserDataValid: function(data) {
        if (data.msisdn) {
            return true;
        }

        return false;
    }
}