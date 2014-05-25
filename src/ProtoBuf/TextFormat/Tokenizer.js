/**
 * @alias ProtoBuf.TextFormat.Tokenizer
 * @expose
 */
ProtoBuf.TextFormat.Tokenizer = (function(Lang) {
    "use strict";
    
    var Tokenizer = function(proto) {
        this.source = ""+proto;
        this.index = 0;
        this.line = 1;
        this.tokenBuffer = [];
        this.readingString = false;
        this.stringEndsWith = "";
    };

    Tokenizer.prototype.next = function() {
        if (this.tokenBuffer.length > 0) {
            return this.tokenBuffer.shift();
        }
        if (this.index >= this.source.length) {
            return null; // No more tokens
        }
        if (this.readingString) {
            this.readingString = false;
            return this._readString();
        }

        // Strip white spaces
        var last, token, end;
        while (Lang.WHITESPACE.test(last = this.source.charAt(this.index))) {
            this.index++;
            if (last === "\n") this.line++;
            if (this.index === this.source.length) return null;
        }

        // Read comment
        if (this.source.charAt(this.index) === '#') {
            end = this.index;
            while (this.source.charAt(end) !== "\n") {
                end++;
                if (end === this.source.length) break;
            }
            token = this.source.substring(this.index, this.index = end);
            return token;
        }

        // Read the next token
        end = this.index;
        Lang.DELIM.lastIndex = 0;
        var delim = Lang.DELIM.test(this.source.charAt(end));
        if (!delim) {
            end++;
            while(end < this.source.length && !Lang.DELIM.test(this.source.charAt(end))) {
                end++;
            }
        } else {
            end++;
        }
        token = this.source.substring(this.index, this.index = end);
        if (token === Lang.STRINGOPEN) {
            this.readingString = true;
            this.stringEndsWith = Lang.STRINGCLOSE;
        } else if (token === Lang.STRINGOPEN_SQ) {
            this.readingString = true;
            this.stringEndsWith = Lang.STRINGCLOSE_SQ;
        }
        return token;
    };

    /**
     * Reads a string beginning at the current index.
     * @return {string} The string
     * @throws {Error} If it's not a valid string
     * @private
     */
    Tokenizer.prototype._readString = function() {
        Lang.STRING.lastIndex = this.index-1; // Include the open quote
        var match;
        if ((match = Lang.STRING.exec(this.source)) !== null) {
            var s = match[1];
            this.index = Lang.STRING.lastIndex;
            this.tokenBuffer.push(this.stringEndsWith);
            return s;
        }
        throw(new Error("Illegal string value at line "+this.line+", index "+this.index));
    };

    return Tokenizer;
})(ProtoBuf.TextFormat.Lang);
