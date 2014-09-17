from random import randint
from flask import Flask, jsonify, render_template, Response, request
from flask_cors import cross_origin
import sys

app = Flask(__name__)


@app.route("/users/tokens/", methods=['POST'])
@cross_origin()
def resolve_user():
    if request.args.get('error'):
        raise ValueError('Ups...')

    return _random_response()


@app.route("/users/tokens/<token>", methods=['GET'])
@cross_origin()
def check_status(token=None):
    return _random_response(token)


@app.route("/oauth/access-token/", methods=['POST'])
@cross_origin()
def authenticate_app():
    return jsonify({
        "access_token": "dh6RSNw01KE4QOf3iFgFq3cTSnWF",
        "token_type": "Bearer",
        "expires_in": "3599"
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


def _user_resolved(token):
    return jsonify({
        "token": token,
        "acr": "204004STATRSV2014-09-10T13:59:29ZjiDcarz5BLCUrIR875pza14gRqP8wOlKfKMA1gfduV2vZXUSJzt4Kc+Q0qUAPO9XC5aLhbxmO00ZR4WVxi1ZMDvP/Wooo/FoA0kedBBIAdeC/yylwlILVlorijDaP/P3R3TzE6zmUDM7zuXbuLwjM+/H7SvTr5pSBopP6rW4tneXZEgBarJ4imCGlf4Q2eOtqkXHJJxn4UmDWNFRo7O+tF52jAnE1mEIEXsdld/M5guMbP6IJs77HECU7jYbYOu+ycty+ovkni+k8L3NdWAxHCkE4CgpC3qKYt6QJkdkrMcO3TsHD+ODcKTclIvtctWcOtcJM4nsV47msWJN6pkZfg==",
        "expiresIn": 298741
    })


def _user_still_resolving(token):
    response = Response(status=302)
    response.headers['Location'] = '/users/tokens/%s' % token
    response.headers['Retry-After'] = '10000'
    return response


def _random_response(token='b949a8e091294fe38525ed0b1561d191'):
    if randint(1, 4) % 4 == 0:
        return _user_resolved(token)
    else:
        return _user_still_resolving(token)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == 'secure':
        app.run('0.0.0.0', debug=True, port=5100, ssl_context='adhoc')
    else:
        app.run('0.0.0.0', debug=True, port=5000)