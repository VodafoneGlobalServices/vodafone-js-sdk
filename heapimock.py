from flask import Flask, jsonify, render_template
from flask_cors import cross_origin
import sys

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
        'ACR': '',
    })


@app.route("/http.html")
def http():
    return render_template("/http.html")


@app.route("/https.html")
def https():
    return render_template("/https.html")


@app.route("/intermediatehttp.html")
def intermediatehttp():
    return render_template("/intermediatehttp.html")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == 'secure':
        app.run('0.0.0.0', debug=True, port=5100, ssl_context='adhoc')
    else:
        app.run('0.0.0.0', debug=True, port=5000)