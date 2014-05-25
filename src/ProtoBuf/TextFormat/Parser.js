/**
 * @alias ProtoBuf.TextFormat.Parser
 * @expose
 */
ProtoBuf.TextFormat.Parser = (function(Lang, Tokenizer, Util) {
    "use strict";

    var Parser = function() {

    };

    var tokenizer;
    var lookaheadToken; // lookahead

    function lookahead() {
        if (lookaheadToken) return lookaheadToken;
        else return lookaheadToken = tokenizer.next();
    }

    function next() {
        if (lookaheadToken) {
            var tmp = lookaheadToken;
            lookaheadToken = null;
            return tmp;
        } else {
            return tokenizer.next();
        }
    }

    function unexpected(token ,msg) {
        throw new Error("Unexpected token '" + token + "' at line " + tokenizer.line + (msg ? "; " + msg : ""));
    }

    Parser.prototype.parse = function(pb) {
        tokenizer = new Tokenizer(pb);

        var value = {};
        var token;
        do {
            token = next();
            if (token == null) break; // no more tokens

            if (Lang.NAME.test(token)) {
                this._parseKeyValPair(value, token);

            } else {
                unexpected(token)

            }
        } while(true);

        return value;
    };

    Parser.prototype._parseKeyValPair = function (ret, key) {
        var token = next();
        var value, comment;

        if (/^[:=]$/.test(token)) { // simple value
            token = next();
            if (/^["']$/.test(token)) { // string
                value = this._parseStringValue(token)
                next(); // eat quote
            } else {
                value = token; // simple
            }

            if (/^#.*/.test(lookahead())) comment = next().substr(1).trim();

        } else if (/^[\{<]$/.test(token)) { // compound value
            value = {};
            while (!/^[\}>]/.test(token = next())) {
                this._parseKeyValPair(value, token);
            }

            //next(); // eat close

        } else {
            unexpected(token);
        }

        // store to output
        if (ret[key]) {
            if (!Util.isArray(ret[key])) {
                ret[key] = [ ret[key] ];
            }
            ret[key].push(value);
        } else {
            ret[key] = value;
        }
    };

    Parser.prototype._parseStringValue = function (quoteType) {
        var value = next();
        return value.substring(1, value.length - 1).replace(/\\(['"])/, '$1');
    };

    Parser.prototype._parseScalarValue = function (token) {
        if (/^\d+$/.test(token)) return token - 0;
        else return token;
    };

    return Parser;
})(ProtoBuf.TextFormat.Lang, ProtoBuf.TextFormat.Tokenizer, ProtoBuf.Util);
