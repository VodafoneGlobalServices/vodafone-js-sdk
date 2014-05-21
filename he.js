/**
 * Header enrichment javascript SDK.
 * Include this script only if the user is not logged in in your application backend.
 *
 * @param heUrl - URL of a server with working header enrichment
 * @param msisdnHeader - name of the header containing the MSISDN
 * @param callbackUrl - URL of the application backend to  notify (sends a JSON with MSISDN)
 * @constructor
 */
function HE(heUrl, msisdnHeader, callbackUrl) {
    this.heUrl = heUrl;
    this.msisdnHeader = msisdnHeader;
    this.callbackUrl = callbackUrl;
}

HE.prototype.callHeBackend = function() {
    var _this = this;

    $.ajax({
        type: 'GET',
        url: this.heUrl,
        success: function(data, textStatus, request){
            _this.notifyAppBackend(data, textStatus, request);
        }
    });
}

HE.prototype.notifyAppBackend = function(data, textStatus, request) {
    var msisdn = request.getResponseHeader(this.msisdnHeader);

    if (msisdn) {
        console.log('Retrieved MSISDN ' + msisdn);

        $.ajax({
            type: 'POST',
            url: this.callbackUrl,
            data: {'msisdn': msisdn},
            success: function() {
                console.log('Application backend notified');
            }
        });
    } else {
        console.log('MSISDN header not found');
    }
}
