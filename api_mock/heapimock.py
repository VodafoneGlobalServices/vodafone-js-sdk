from flask import Flask, jsonify
from flask_cors import cross_origin

app = Flask(__name__)


@app.route("/users/resolve/")
@cross_origin()
def resolve_user():
    return jsonify({
        'resolved': True,
        'stillRunning': False,
        'source': 'header',
        'token': '000000000000',
        'expires': '2014-08-01T04:00:33+00:00',
        'tetheringConflict': False,
        'secure': False,
        'validated': False,
        'MSISDN': '0048000000000',
        'ACR': '',
    })

if __name__ == "__main__":
    app.run()