// #ifdef UNDEFINED
/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
// #endif
/**
 * @alias ProtoBuf.DotProto.Tokenizer
 * @expose
 */
ProtoBuf.DotProto.Tokenizer = (function(Lang) {

    /**
     * Constructs a new Tokenizer.
     * @exports ProtoBuf.DotProto.Tokenizer
     * @class A ProtoBuf .proto Tokenizer.
     * @param {string} proto Proto to tokenize
     * @param {dict} options
     * @constructor
     */
    var Tokenizer = function(proto, options) {
        options = options || {};
        
        /**
         * Source to parse.
         * @type {string}
         * @expose
         */
        this.source = ""+proto;
        
        /**
         * Current index.
         * @type {number}
         * @expose
         */
        this.index = 0;

        /**
         * Current line.
         * @type {number}
         * @expose
         */
        this.line = 1;

        /**
         * Stacked values.
         * @type {Array}
         * @expose
         */
        this.stack = [];

        /**
         * Whether currently reading a string or not.
         * @type {boolean}
         * @expose
         */
        this.readingString = false;

        /**
         * Whatever character ends the string. Either a single or double quote character.
         * @type {string}
         * @expose
         */
        this.stringEndsWith = Lang.STRINGCLOSE;

        this.readWhiteSpace = !!options.readWhiteSpace;
        this.readComments = !!options.readComments;
        this.commentBuffer = [];
        this.lastComment = null;
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
            this.stack.push(this.stringEndsWith);
            return s;
        }
        throw(new Error("Illegal string value at line "+this.line+", index "+this.index));
    };

    /**
     * Gets the next token and advances by one.
     * @return {?string} Token or `null` on EOF
     * @throws {Error} If it's not a valid proto file
     * @expose
     */
    Tokenizer.prototype.next = function() {
        if (this.stack.length > 0) {
            return this.stack.shift();
        }

        var token, keep;
        do {
            token = this._next();
            if (token === null) return null; // no more tokens

            if (/^\/[\/\*]/.test(token)) {
                this.commentBuffer.push(token);
                keep = this.readComments;
            } else if (/^\s+/.test(token)) {
                keep = this.readWhiteSpace;
            } else {
                this.lastComment = this.commentBuffer.length > 0 ? this.commentBuffer.join("").trim() : null;
                this.commentBuffer = [];
                keep = true;
            }

        } while (!keep);

        return token;
    };

    /**
     * Gets the next token and advances by one.
     * @return {?string} Token or `null` on EOF
     * @throws {Error} If it's not a valid proto file
     */
    Tokenizer.prototype._next = function() {
        if (this.index >= this.source.length) {
            return null; // No more tokens
        }
        if (this.readingString) {
            this.readingString = false;
            return this._readString();
        }
        var end = this.index;
        var last;

        // White spaces
        while (Lang.WHITESPACE.test(last = this.source.charAt(end))) {
            end++;
            if (last === "\n") this.line++;
            if (end === this.source.length) break;
        }
        if (end > this.index) {
            return this.source.substring(this.index, this.index = end);
        }

        // Comments
        if (this.source.charAt(end) === '/') {
            if (this.source.charAt(++end) === '/') { // Single line
                while (this.source.charAt(end) !== "\n") {
                    end++;
                    if (end == this.source.length) break;
                }
                end++;
                this.line++;
            } else if (this.source.charAt(end) === '*') { /* Block */
                last = '';
                while (last+(last=this.source.charAt(end)) !== '*/') {
                    end++;
                    if (last === "\n") this.line++;
                    if (end === this.source.length) return null;
                }
                end++;
            } else {
                throw(new Error("Invalid comment at line "+this.line+": /"+this.source.charAt(this.index)+" ('/' or '*' expected)"));
            }
            return this.source.substring(this.index, this.index = end);
        }

        // Next token
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
        var token = this.source.substring(this.index, this.index = end);
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
     * Peeks for the next token.
     * @return {?string} Token or `null` on EOF
     * @throws {Error} If it's not a valid proto file
     * @expose
     */
    Tokenizer.prototype.peek = function() {
        if (this.stack.length == 0) {
            var token = this.next();
            if (token === null) return null;
            this.stack.push(token);
        }
        return this.stack[0];
    };

    /**
     * Returns a string representation of this object.
     * @return {string} String representation as of "Tokenizer(index/length)"
     * @expose
     */
    Tokenizer.prototype.toString = function() {
        return "Tokenizer("+this.index+"/"+this.source.length+" at line "+this.line+")";
    };

    return Tokenizer;
    
})(ProtoBuf.Lang);
