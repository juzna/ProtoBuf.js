/**
 * @alias ProtoBuf.TextFormat.Lang
 * @expose
 */
ProtoBuf.TextFormat.Lang = (function() {
    "use strict";

    /**
     * ProtoBuf TextFormated Language.
     * @exports ProtoBuf.TextFormat.Lang
     * @type {Object.<string,string|RegExp>}
     * @namespace
     * @expose
     */
     var Lang = {
        WHITESPACE: /\s/,

        STRING: /(("(\\"|[^"])*")|('(\\'|[^'])*'))/g,
        STRINGOPEN: '"',
        STRINGCLOSE: '"',
        STRINGOPEN_SQ: "'",
        STRINGCLOSE_SQ: "'",

        DELIM: /[\s\{\}<>:#"']/g,

        NAME: /^[a-zA-Z_][a-zA-Z_0-9]*$/,
     };
     return Lang;
})();
