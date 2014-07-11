var HE = {
    options: {
        resolveUserUrl: 'he.incubation.vodafone.com/users/resolve'
    },

    init: function (options) {
        for (var key in options) {
            this.options[key] = options[key];
        }

        return this;
    },

    getUserDetail: function (callback) {
        $.ajax({
            type: 'GET',
            url: this.options.resolveUserUrl,
            success: function (data, textStatus, request) {
                callback(data);
            }
        });
    }
}