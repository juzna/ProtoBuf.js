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

/**
 * @license ProtoBuf.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/ProtoBuf.js for details
 */
(function(global) {
    "use strict";
    
    function loadProtoBuf(ByteBuffer) {

        /**
         * The ProtoBuf namespace.
         * @exports ProtoBuf
         * @namespace
         * @expose
         */
        var ProtoBuf = {};
        
        /**
         * ProtoBuf.js version.
         * @type {string}
         * @const
         * @expose
         */
        ProtoBuf.VERSION = "2.2.0";

        /**
         * Wire types.
         * @type {Object.<string,number>}
         * @const
         * @expose
         */
        ProtoBuf.WIRE_TYPES = {};

        /**
         * Varint wire type.
         * @type {number}
         * @expose
         */
        ProtoBuf.WIRE_TYPES.VARINT = 0;

        /**
         * Fixed 64 bits wire type.
         * @type {number}
         * @const
         * @expose
         */
        ProtoBuf.WIRE_TYPES.BITS64 = 1;

        /**
         * Length delimited wire type.
         * @type {number}
         * @const
         * @expose
         */
        ProtoBuf.WIRE_TYPES.LDELIM = 2;

        /**
         * Start group wire type.
         * @type {number}
         * @const
         * @deprecated Not supported.
         * @expose
         */
        ProtoBuf.WIRE_TYPES.STARTGROUP = 3;

        /**
         * End group wire type.
         * @type {number}
         * @const
         * @deprecated Not supported.
         * @expose
         */
        ProtoBuf.WIRE_TYPES.ENDGROUP = 4;

        /**
         * Fixed 32 bits wire type.
         * @type {number}
         * @const
         * @expose
         */
        ProtoBuf.WIRE_TYPES.BITS32 = 5;

        /**
         * Types.
         * @dict
         * @type {Object.<string,{name: string, wireType: number}>}
         * @const
         * @expose
         */
        ProtoBuf.TYPES = {
            // According to the protobuf spec.
            "int32": {
                name: "int32",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "uint32": {
                name: "uint32",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "sint32": {
                name: "sint32",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "int64": {
                name: "int64",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "uint64": {
                name: "uint64",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "sint64": {
                name: "sint64",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "bool": {
                name: "bool",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "double": {
                name: "double",
                wireType: ProtoBuf.WIRE_TYPES.BITS64
            },
            "string": {
                name: "string",
                wireType: ProtoBuf.WIRE_TYPES.LDELIM
            },
            "bytes": {
                name: "bytes",
                wireType: ProtoBuf.WIRE_TYPES.LDELIM
            },
            "fixed32": {
                name: "fixed32",
                wireType: ProtoBuf.WIRE_TYPES.BITS32
            },
            "sfixed32": {
                name: "sfixed32",
                wireType: ProtoBuf.WIRE_TYPES.BITS32
            },
            "fixed64": {
                name: "fixed64",
                wireType: ProtoBuf.WIRE_TYPES.BITS64
            },
            "sfixed64": {
                name: "sfixed64",
                wireType: ProtoBuf.WIRE_TYPES.BITS64
            },
            "float": {
                name: "float",
                wireType: ProtoBuf.WIRE_TYPES.BITS32
            },
            "enum": {
                name: "enum",
                wireType: ProtoBuf.WIRE_TYPES.VARINT
            },
            "message": {
                name: "message",
                wireType: ProtoBuf.WIRE_TYPES.LDELIM
            }
        };

        /**
         * @type {?Long}
         */
        ProtoBuf.Long = ByteBuffer.Long;

        /**
         * If set to `true`, field names will be converted from underscore notation to camel case. Defaults to `false`.
         *  Must be set prior to parsing.
         * @type {boolean}
         * @expose
         */
        ProtoBuf.convertFieldsToCamelCase = false;
        
        /**
         * @alias ProtoBuf.Util
         * @expose
         */
        ProtoBuf.Util = (function() {
            "use strict";
        
            // Object.create polyfill
            // ref: https://developer.mozilla.org/de/docs/JavaScript/Reference/Global_Objects/Object/create
            if (!Object.create) {
                /** @expose */
                Object.create = function (o) {
                    if (arguments.length > 1) {
                        throw new Error('Object.create implementation only accepts the first parameter.');
                    }
                    function F() {}
                    F.prototype = o;
                    return new F();
                };
            }
        
            /**
             * ProtoBuf utilities.
             * @exports ProtoBuf.Util
             * @namespace
             */
            var Util = {};
        
            /**
             * Flag if running in node or not.
             * @type {boolean}
             * @const
             * @expose
             */
            Util.IS_NODE = (typeof window === 'undefined' || !window.window) && typeof require === 'function' && typeof process !== 'undefined' && typeof process["nextTick"] === 'function';
            
            /**
             * Constructs a XMLHttpRequest object.
             * @return {XMLHttpRequest}
             * @throws {Error} If XMLHttpRequest is not supported
             * @expose
             */
            Util.XHR = function() {
                // No dependencies please, ref: http://www.quirksmode.org/js/xmlhttp.html
                var XMLHttpFactories = [
                    function () {return new XMLHttpRequest()},
                    function () {return new ActiveXObject("Msxml2.XMLHTTP")},
                    function () {return new ActiveXObject("Msxml3.XMLHTTP")},
                    function () {return new ActiveXObject("Microsoft.XMLHTTP")}
                ];
                /** @type {?XMLHttpRequest} */
                var xhr = null;
                for (var i=0;i<XMLHttpFactories.length;i++) {
                    try { xhr = XMLHttpFactories[i](); }
                    catch (e) { continue; }
                    break;
                }
                if (!xhr) throw(new Error("XMLHttpRequest is not supported"));
                return xhr;
            };
        
            /**
             * Fetches a resource.
             * @param {string} path Resource path
             * @param {function(?string)=} callback Callback receiving the resource's contents. If omitted the resource will
             *   be fetched synchronously. If the request failed, contents will be null.
             * @return {?string|undefined} Resource contents if callback is omitted (null if the request failed), else undefined.
             * @expose
             */
            Util.fetch = function(path, callback) {
                if (callback && typeof callback != 'function') callback = null;
                if (Util.IS_NODE) {
                    if (callback) {
                        require("fs").readFile(path, function(err, data) {
                            if (err) {
                                callback(null);
                            }
                            else callback(""+data);
                        });
                    } else {
                        try {
                            return require("fs").readFileSync(path);
                        } catch (e) {
                            return null;
                        }
                    }
                } else {
                    var xhr = Util.XHR();
                    xhr.open('GET', path, callback ? true : false);
                    // xhr.setRequestHeader('User-Agent', 'XMLHTTP/1.0');
                    xhr.setRequestHeader('Accept', 'text/plain');
                    if (typeof xhr.overrideMimeType === 'function') xhr.overrideMimeType('text/plain');
                    if (callback) {
                        xhr.onreadystatechange = function() {
                            if (xhr.readyState != 4) return;
                            if (/* remote */ xhr.status == 200 || /* local */ (xhr.status == 0 && typeof xhr.responseText === 'string')) {
                                callback(xhr.responseText);
                            } else {
                                callback(null);
                            }
                        };
                        if (xhr.readyState == 4) return;
                        xhr.send(null);
                    } else {
                        xhr.send(null);
                        if (/* remote */ xhr.status == 200 || /* local */ (xhr.status == 0 && typeof xhr.responseText === 'string')) {
                            return xhr.responseText;
                        }
                        return null;
                    }
                }
            };
        
            /**
             * Tests if an object is an array.
             * @param {*} obj Object to test
             * @returns {boolean} true if it is an array, else false
             * @expose
             */
            Util.isArray = function(obj) {
                if (!obj) return false;
                if (obj instanceof Array) return true;
                if (Array.isArray) return Array.isArray(obj);
                return Object.prototype.toString.call(obj) === "[object Array]";
            };
            
            return Util;
        })();        
        /**
         * @alias ProtoBuf.Lang
         * @expose
         */
        ProtoBuf.Lang = (function() {
            "use strict";
            
            /**
             * ProtoBuf Language.
             * @exports ProtoBuf.Lang
             * @type {Object.<string,string|RegExp>}
             * @namespace
             * @expose
             */
            var Lang = { // Look, so cute!
                OPEN: "{",
                CLOSE: "}",
                OPTOPEN: "[",
                OPTCLOSE: "]",
                OPTEND: ",",
                EQUAL: "=",
                END: ";",
                STRINGOPEN: '"',
                STRINGCLOSE: '"',
                STRINGOPEN_SQ: "'",
                STRINGCLOSE_SQ: "'",
                COPTOPEN: '(',
                COPTCLOSE: ')',
        
                DELIM: /[\s\{\}=;\[\],'"\(\)]/g,
                
                KEYWORD: /^(?:package|option|import|message|enum|extend|service|syntax|extensions)$/,
                RULE: /^(?:required|optional|repeated)$/,
                TYPE: /^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,
                NAME: /^[a-zA-Z_][a-zA-Z_0-9]*$/,
                OPTNAME: /^(?:[a-zA-Z][a-zA-Z_0-9]*|\([a-zA-Z][a-zA-Z_0-9]*\))$/,
                TYPEDEF: /^[a-zA-Z][a-zA-Z_0-9]*$/,
                TYPEREF: /^(?:\.?[a-zA-Z][a-zA-Z_0-9]*)+$/,
                GROUP: /^group$/,
                FQTYPEREF: /^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/,
                NUMBER: /^-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+|[0-9]*\.[0-9]+)$/,
                NUMBER_DEC: /^(?:[1-9][0-9]*|0)$/,
                NUMBER_HEX: /^0x[0-9a-fA-F]+$/,
                NUMBER_OCT: /^0[0-7]+$/,
                NUMBER_FLT: /^[0-9]*\.[0-9]+$/,
                ID: /^(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,
                NEGID: /^\-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,
                WHITESPACE: /\s/,
                STRING: /['"]([^'"\\]*(\\.[^"\\]*)*)['"]/g,
                BOOL: /^(?:true|false)$/i,
        
                ID_MIN: 1,
                ID_MAX: 0x1FFFFFFF
            };
            return Lang;
        })();
                
        // This build of ProtoBuf.js does not include DotProto support.
        
        /**
         * @alias ProtoBuf.Reflect
         * @expose
         */
        ProtoBuf.Reflect = (function(ProtoBuf) {
            "use strict";
            
            /**
             * @exports ProtoBuf.Reflect
             * @namespace
             */
            var Reflect = {};
        
            /**
             * Constructs a Reflect base class.
             * @exports ProtoBuf.Reflect.T
             * @constructor
             * @param {ProtoBuf.Reflect.T} parent Parent object
             * @param {string} name Object name
             */
            var T = function(parent, name) {
                /**
                 * Parent object.
                 * @type {ProtoBuf.Reflect.T|null}
                 * @expose
                 */
                this.parent = parent;
        
                /**
                 * Object name in namespace.
                 * @type {string}
                 * @expose
                 */
                this.name = name;
            };
        
            /**
             * Returns the fully qualified name of this object.
             * @returns {string} Fully qualified name as of ".PATH.TO.THIS"
             * @expose
             */
            T.prototype.fqn = function() {
                var name = this.name,
                    ptr = this;
                do {
                    ptr = ptr.parent;
                    if (ptr == null) break;
                    name = ptr.name+"."+name;
                } while (true);
                return name;
            };
        
            /**
             * Returns a string representation of this Reflect object (its fully qualified name).
             * @param {boolean=} includeClass Set to true to include the class name. Defaults to false.
             * @return String representation
             * @expose
             */
            T.prototype.toString = function(includeClass) {
                var name = this.fqn();
                if (includeClass) {
                    if (this instanceof Message) {
                        name = "Message "+name;
                    } else if (this instanceof Message.Field) {
                        name = "Message.Field "+name;
                    } else if (this instanceof Enum) {
                        name = "Enum "+name;
                    } else if (this instanceof Enum.Value) {
                        name = "Enum.Value "+name;
                    } else if (this instanceof Service) {
                        name = "Service "+name;
                    } else if (this instanceof Service.Method) {
                        if (this instanceof Service.RPCMethod) {
                            name = "Service.RPCMethod "+name;
                        } else {
                            name = "Service.Method "+name; // Should not happen as it is abstract
                        }
                    } else if (this instanceof Namespace) {
                        name = "Namespace "+name;
                    }
                }
                return name;
            };
        
            /**
             * Builds this type.
             * @throws {Error} If this type cannot be built directly
             * @expose
             */
            T.prototype.build = function() {
                throw(new Error(this.toString(true)+" cannot be built directly"));
            };
        
            /**
             * @alias ProtoBuf.Reflect.T
             * @expose
             */
            Reflect.T = T;
        
            /**
             * Constructs a new Namespace.
             * @exports ProtoBuf.Reflect.Namespace
             * @param {ProtoBuf.Reflect.Namespace|null} parent Namespace parent
             * @param {string} name Namespace name
             * @param {Object.<string,*>} options Namespace options
             * @constructor
             * @extends ProtoBuf.Reflect.T
             */
            var Namespace = function(parent, name, options) {
                T.call(this, parent, name);
        
                /**
                 * Children inside the namespace.
                 * @type {Array.<ProtoBuf.Reflect.T>}
                 */
                this.children = [];
        
                /**
                 * Options.
                 * @type {Object.<string, *>}
                 */
                this.options = options || {};
            };
        
            // Extends T
            Namespace.prototype = Object.create(T.prototype);
        
            /**
             * Returns an array of the namespace's children.
             * @param {ProtoBuf.Reflect.T=} type Filter type (returns instances of this type only). Defaults to null (all children).
             * @return {Array.<ProtoBuf.Reflect.T>}
             * @expose
             */
            Namespace.prototype.getChildren = function(type) {
                type = type || null;
                if (type == null) {
                    return this.children.slice();
                }
                var children = [];
                for (var i=0; i<this.children.length; i++) {
                    if (this.children[i] instanceof type) {
                        children.push(this.children[i]);
                    }
                }
                return children;
            };
        
            /**
             * Adds a child to the namespace.
             * @param {ProtoBuf.Reflect.T} child Child
             * @throws {Error} If the child cannot be added (duplicate)
             * @expose
             */
            Namespace.prototype.addChild = function(child) {
                var other;
                if (other = this.getChild(child.name)) {
                    // Try to revert camelcase transformation on collision
                    if (other instanceof Message.Field && other.name !== other.originalName && !this.hasChild(other.originalName)) {
                        other.name = other.originalName; // Revert previous first (effectively keeps both originals)
                    } else if (child instanceof Message.Field && child.name !== child.originalName && !this.hasChild(child.originalName)) {
                        child.name = child.originalName;
                    } else {
                        throw(new Error("Duplicate name in namespace "+this.toString(true)+": "+child.name));
                    }
                }
                this.children.push(child);
            };
        
            /**
             * Tests if this namespace has a child with the specified name.
             * @param {string|number} nameOrId Child name or id
             * @returns {boolean} true if there is one, else false
             * @expose
             */
            Namespace.prototype.hasChild = function(nameOrId) {
                var i;
                if (typeof nameOrId == 'number') {
                    for (i=0; i<this.children.length; i++) if (typeof this.children[i].id !== 'undefined' && this.children[i].id == nameOrId) return true;
                } else {
                    for (i=0; i<this.children.length; i++) if (typeof this.children[i].name !== 'undefined' && this.children[i].name == nameOrId) return true;
                }
                return false;
            };
        
            /**
             * Gets a child by its name.
             * @param {string|number} nameOrId Child name or id
             * @return {?ProtoBuf.Reflect.T} The child or null if not found
             * @expose
             */
            Namespace.prototype.getChild = function(nameOrId) {
                var i;
                if (typeof nameOrId == 'number') {
                    for (i=0; i<this.children.length; i++) if (typeof this.children[i].id !== 'undefined' && this.children[i].id == nameOrId) return this.children[i];
                } else {
                    for (i=0; i<this.children.length; i++) if (typeof this.children[i].name !== 'undefined' && this.children[i].name == nameOrId) return this.children[i];
                }
                return null;
            };
        
            /**
             * Resolves a reflect object inside of this namespace.
             * @param {string} qn Qualified name to resolve
             * @param {boolean=} excludeFields Excludes fields, defaults to `false`
             * @return {ProtoBuf.Reflect.Namespace|null} The resolved type or null if not found
             * @expose
             */
            Namespace.prototype.resolve = function(qn, excludeFields) {
                var part = qn.split(".");
                var ptr = this, i=0;
                if (part[i] == "") { // Fully qualified name, e.g. ".My.Message'
                    while (ptr.parent != null) {
                        ptr = ptr.parent;
                    }
                    i++;
                }
                var child;
                do {
                    do {
                        child = ptr.getChild(part[i]);
                        if (!child || !(child instanceof Reflect.T) || (excludeFields && child instanceof Reflect.Message.Field)) {
                            ptr = null;
                            break;
                        }
                        ptr = child; i++;
                    } while (i < part.length);
                    if (ptr != null) break; // Found
                    // Else search the parent
                    if (this.parent !== null) {
                        return this.parent.resolve(qn, excludeFields);
                    }
                } while (ptr != null);
                return ptr;
            };
        
            /**
             * Builds the namespace and returns the runtime counterpart.
             * @return {Object.<string,Function|Object>} Runtime namespace
             * @expose
             */
            Namespace.prototype.build = function() {
                /** @dict */
                var ns = {};
                var children = this.getChildren(), child;
                for (var i=0; i<children.length; i++) {
                    child = children[i];
                    if (child instanceof Namespace) {
                        ns[child.name] = child.build();
                    }
                }
                if (Object.defineProperty) {
                    Object.defineProperty(ns, "$options", {
                        "value": this.buildOpt(),
                        "enumerable": false,
                        "configurable": false,
                        "writable": false
                    });
                }
                return ns;
            };
        
            /**
             * Builds the namespace's '$options' property.
             * @return {Object.<string,*>}
             */
            Namespace.prototype.buildOpt = function() {
                var opt = {};
                var keys = Object.keys(this.options);
                for (var i=0; i<keys.length; i++) {
                    var key = keys[i];
                    var val = this.options[keys[i]];
                    // TODO: Options are not resolved, yet.
                    // if (val instanceof Namespace) {
                    //     opt[key] = val.build();
                    // } else {
                        opt[key] = val;
                    // }
                }
                return opt;
            };
        
            /**
             * Gets the value assigned to the option with the specified name.
             * @param {string=} name Returns the option value if specified, otherwise all options are returned.
             * @return {*|Object.<string,*>}null} Option value or NULL if there is no such option
             */
            Namespace.prototype.getOption = function(name) {
                if (typeof name == 'undefined') {
                    return this.options;
                }
                return typeof this.options[name] != 'undefined' ? this.options[name] : null;
            };
        
            /**
             * @alias ProtoBuf.Reflect.Namespace
             * @expose
             */
            Reflect.Namespace = Namespace;
        
            /**
             * Constructs a new Message.
             * @exports ProtoBuf.Reflect.Message
             * @param {ProtoBuf.Reflect.Namespace} parent Parent message or namespace
             * @param {string} name Message name
             * @param {Object.<string,*>} options Message options
             * @constructor
             * @extends ProtoBuf.Reflect.Namespace
             */
            var Message = function(parent, name, options) {
                Namespace.call(this, parent, name, options);
        
                /**
                 * Extensions range.
                 * @type {!Array.<number>}
                 * @expose
                 */
                this.extensions = [ProtoBuf.Lang.ID_MIN, ProtoBuf.Lang.ID_MAX];
        
                /**
                 * Runtime message class.
                 * @type {?function(new:ProtoBuf.Builder.Message)}
                 * @expose
                 */
                this.clazz = null;
            };
        
            // Extends Namespace
            Message.prototype = Object.create(Namespace.prototype);
        
            /**
             * Builds the message and returns the runtime counterpart, which is a fully functional class.
             * @see ProtoBuf.Builder.Message
             * @param {boolean=} rebuild Whether to rebuild or not, defaults to false
             * @return {ProtoBuf.Reflect.Message} Message class
             * @throws {Error} If the message cannot be built
             * @expose
             */
            Message.prototype.build = function(rebuild) {
                if (this.clazz && !rebuild) return this.clazz;
                
                // We need to create a prototyped Message class in an isolated scope
                var clazz = (function(ProtoBuf, T) {
                    var fields = T.getChildren(Reflect.Message.Field);
        
                    /**
                     * Constructs a new runtime Message.
                     * @name ProtoBuf.Builder.Message
                     * @class Barebone of all runtime messages.
                     * @param {Object.<string,*>|...[string]} values Preset values
                     * @constructor
                     * @throws {Error} If the message cannot be created
                     */
                    var Message = function(values) {
                        ProtoBuf.Builder.Message.call(this);
                        var i, field;
        
                        // Create fields on the object itself to allow setting and getting through Message#fieldname
                        for (i=0; i<fields.length; i++) {
                            field = fields[i];
                            this[field.name] = (field.repeated) ? [] : null;
                        }
                        // Set the default values
                        for (i=0; i<fields.length; i++) {
                            field = fields[i];
                            if (typeof field.options['default'] != 'undefined') {
                                try {
                                    this.$set(field.name, field.options['default']); // Should not throw
                                } catch (e) {
                                    throw(new Error("[INTERNAL] "+e));
                                }
                            }
                        }
                        // Set field values from a values object
                        if (arguments.length == 1 && typeof values == 'object' &&
                            /* not another Message */ typeof values.encode != 'function' &&
                            /* not a repeated field */ !ProtoBuf.Util.isArray(values) &&
                            /* not a ByteBuffer */ !(values instanceof ByteBuffer) &&
                            /* not an ArrayBuffer */ !(values instanceof ArrayBuffer) &&
                            /* not a Long */ !(ProtoBuf.Long && values instanceof ProtoBuf.Long)) {
                            var keys = Object.keys(values);
                            for (i=0; i<keys.length; i++) {
                                this.$set(keys[i], values[keys[i]]); // May throw
                            }
                            // Else set field values from arguments, in correct order
                        } else {
                            for (i=0; i<arguments.length; i++) {
                                if (i<fields.length) {
                                    this.$set(fields[i].name, arguments[i]); // May throw
                                }
                            }
                        }
                    };
        
                    // Extends ProtoBuf.Builder.Message
                    Message.prototype = Object.create(ProtoBuf.Builder.Message.prototype);
        
                    /**
                     * Adds a value to a repeated field.
                     * @name ProtoBuf.Builder.Message#add
                     * @function
                     * @param {string} key Field name
                     * @param {*} value Value to add
                     * @param {boolean=} noAssert Whether to assert the value or not (asserts by default)
                     * @throws {Error} If the value cannot be added
                     * @expose
                     */
                    Message.prototype.add = function(key, value, noAssert) {
                        var field = T.getChild(key);
                        if (!field) {
                            throw(new Error(this+"#"+key+" is undefined"));
                        }
                        if (!(field instanceof ProtoBuf.Reflect.Message.Field)) {
                            throw(new Error(this+"#"+key+" is not a field: "+field.toString(true))); // May throw if it's an enum or embedded message
                        }
                        if (!field.repeated) {
                            throw(new Error(this+"#"+key+" is not a repeated field"));
                        }
                        if (this[field.name] === null) this[field.name] = [];
                        this[field.name].push(noAssert ? value : field.verifyValue(value, true));
                    };
        
                    /**
                     * Adds a value to a repeated field. This is an alias for {@link ProtoBuf.Builder.Message#add}.
                     * @name ProtoBuf.Builder.Message#$add
                     * @function
                     * @param {string} key Field name
                     * @param {*} value Value to add
                     * @param {boolean=} noAssert Whether to assert the value or not (asserts by default)
                     * @throws {Error} If the value cannot be added
                     * @expose
                     */
                    Message.prototype.$add = Message.prototype.add;
        
                    /**
                     * Sets a field's value.
                     * @name ProtoBuf.Builder.Message#set
                     * @function
                     * @param {string} key Key
                     * @param {*} value Value to set
                     * @param {boolean=} noAssert Whether to assert the value or not (asserts by default)
                     * @throws {Error} If the value cannot be set
                     * @expose
                     */
                    Message.prototype.set = function(key, value, noAssert) {
                        var field = T.getChild(key);
                        if (!field) {
                            throw(new Error(this+"#"+key+" is not a field: undefined"));
                        }
                        if (!(field instanceof ProtoBuf.Reflect.Message.Field)) {
                            throw(new Error(this+"#"+key+" is not a field: "+field.toString(true)));
                        }
                        this[field.name] = noAssert ? value : field.verifyValue(value); // May throw
                    };
        
                    /**
                     * Sets a field's value. This is an alias for [@link ProtoBuf.Builder.Message#set}.
                     * @name ProtoBuf.Builder.Message#$set
                     * @function
                     * @param {string} key Key
                     * @param {*} value Value to set
                     * @param {boolean=} noAssert Whether to assert the value or not (asserts by default)
                     * @throws {Error} If the value cannot be set
                     * @expose
                     */
                    Message.prototype.$set = Message.prototype.set;
        
                    /**
                     * Gets a field's value.
                     * @name ProtoBuf.Builder.Message#get
                     * @function
                     * @param {string} key Key
                     * @return {*} Value
                     * @throws {Error} If there is no such field
                     * @expose
                     */
                    Message.prototype.get = function(key) {
                        var field = T.getChild(key);
                        if (!field || !(field instanceof ProtoBuf.Reflect.Message.Field)) {
                            throw(new Error(this+"#"+key+" is not a field: undefined"));
                        }
                        if (!(field instanceof ProtoBuf.Reflect.Message.Field)) {
                            throw(new Error(this+"#"+key+" is not a field: "+field.toString(true)));
                        }
                        return this[field.name];
                    };
        
                    /**
                     * Gets a field's value. This is an alias for {@link ProtoBuf.Builder.Message#$get}.
                     * @name ProtoBuf.Builder.Message#get
                     * @function
                     * @param {string} key Key
                     * @return {*} Value
                     * @throws {Error} If there is no such field
                     * @expose
                     */
                    Message.prototype.$get = Message.prototype.get;
        
                    // Getters and setters
        
                    for (var i=0; i<fields.length; i++) {
                        var field = fields[i];
                        
                        (function(field) {
                            // set/get[SomeValue]
                            var Name = field.originalName.replace(/(_[a-zA-Z])/g,
                                function(match) {
                                    return match.toUpperCase().replace('_','');
                                }
                            );
                            Name = Name.substring(0,1).toUpperCase()+Name.substring(1);
            
                            // set/get_[some_value]
                            var name = field.originalName.replace(/([A-Z])/g,
                                function(match) {
                                    return "_"+match;
                                }
                            );
            
                            /**
                             * Sets a value. This method is present for each field, but only if there is no name conflict with
                             * another field.
                             * @name ProtoBuf.Builder.Message#set[SomeField]
                             * @function
                             * @param {*} value Value to set
                             * @abstract
                             * @throws {Error} If the value cannot be set
                             */
                            if (!T.hasChild("set"+Name)) {
                                Message.prototype["set"+Name] = function(value) {
                                    this.$set(field.name, value);
                                }
                            }
            
                            /**
                             * Sets a value. This method is present for each field, but only if there is no name conflict with
                             * another field.
                             * @name ProtoBuf.Builder.Message#set_[some_field]
                             * @function
                             * @param {*} value Value to set
                             * @abstract
                             * @throws {Error} If the value cannot be set
                             */
                            if (!T.hasChild("set_"+name)) {
                                Message.prototype["set_"+name] = function(value) {
                                    this.$set(field.name, value);
                                };
                            }
            
                            /**
                             * Gets a value. This method is present for each field, but only if there is no name conflict with
                             * another field.
                             * @name ProtoBuf.Builder.Message#get[SomeField]
                             * @function
                             * @abstract
                             * @return {*} The value
                             */
                            if (!T.hasChild("get"+Name)) {
                                Message.prototype["get"+Name] = function() {
                                    return this.$get(field.name); // Does not throw, field exists
                                }
                            }
            
                            /**
                             * Gets a value. This method is present for each field, but only if there is no name conflict with
                             * another field.
                             * @name ProtoBuf.Builder.Message#get_[some_field]
                             * @function
                             * @return {*} The value
                             * @abstract
                             */
                            if (!T.hasChild("get_"+name)) {
                                Message.prototype["get_"+name] = function() {
                                    return this.$get(field.name); // Does not throw, field exists
                                };
                            }
                            
                        })(field);
                    }
        
                    // En-/decoding
        
                    /**
                     * Encodes the message.
                     * @name ProtoBuf.Builder.Message#$encode
                     * @function
                     * @param {(!ByteBuffer|boolean)=} buffer ByteBuffer to encode to. Will create a new one and flip it if omitted.
                     * @return {!ByteBuffer} Encoded message as a ByteBuffer
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded ByteBuffer in the `encoded` property on the error.
                     * @expose
                     * @see ProtoBuf.Builder.Message#encode64
                     * @see ProtoBuf.Builder.Message#encodeHex
                     * @see ProtoBuf.Builder.Message#encodeAB
                     */
                    Message.prototype.encode = function(buffer) {
                        var isNew = false;
                        if (!buffer) {
                            buffer = new ByteBuffer();
                            isNew = true;
                        }
                        var le = buffer.littleEndian;
                        try {
                            T.encode(this, buffer.LE());
                            return (isNew ? buffer.flip() : buffer).LE(le);
                        } catch (e) {
                            buffer.LE(le);
                            throw(e);
                        }
                    };
        
                    /**
                     * Encodes the varint32 length-delimited message.
                     * @name ProtoBuf.Builder.Message#encodeDelimited
                     * @function
                     * @param {(!ByteBuffer|boolean)=} buffer ByteBuffer to encode to. Will create a new one and flip it if omitted.
                     * @return {!ByteBuffer} Encoded message as a ByteBuffer
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded ByteBuffer in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.encodeDelimited = function(buffer) {
                        var isNew = false;
                        if (!buffer) {
                            buffer = new ByteBuffer();
                            isNew = true;
                        }
                        // var le = buffer.littleEndian;
                        try {
                            var enc = new ByteBuffer().LE();
                            T.encode(this, enc).flip();
                            buffer.writeVarint32(enc.remaining());
                            buffer.append(enc);
                            return isNew ? buffer.flip() : buffer;
                        } catch (e) {
                            // buffer.LE(le);
                            throw(e);
                        }
                    };
        
                    /**
                     * Directly encodes the message to an ArrayBuffer.
                     * @name ProtoBuf.Builder.Message#encodeAB
                     * @function
                     * @return {ArrayBuffer} Encoded message as ArrayBuffer
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded ArrayBuffer in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.encodeAB = function() {
                        try {
                            return this.encode().toArrayBuffer();
                        } catch (err) {
                            if (err["encoded"]) err["encoded"] = err["encoded"].toArrayBuffer();
                            throw(err);
                        }
                    };
        
                    /**
                     * Returns the message as an ArrayBuffer. This is an alias for {@link ProtoBuf.Builder.Message#encodeAB}.
                     * @name ProtoBuf.Builder.Message#toArrayBuffer
                     * @function
                     * @return {ArrayBuffer} Encoded message as ArrayBuffer
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded ArrayBuffer in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.toArrayBuffer = Message.prototype.encodeAB;
        
                    /**
                     * Directly encodes the message to a node Buffer.
                     * @name ProtoBuf.Builder.Message#encodeNB
                     * @function
                     * @return {!Buffer}
                     * @throws {Error} If the message cannot be encoded, not running under node.js or if required fields are
                     *  missing. The later still returns the encoded node Buffer in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.encodeNB = function() {
                        try {
                            return this.encode().toBuffer();
                        } catch (err) {
                            if (err["encoded"]) err["encoded"] = err["encoded"].toBuffer();
                            throw(err);
                        }
                    };
        
                    /**
                     * Returns the message as a node Buffer. This is an alias for {@link ProtoBuf.Builder.Message#encodeNB}.
                     * @name ProtoBuf.Builder.Message#encodeNB
                     * @function
                     * @return {!Buffer}
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded node Buffer in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.toBuffer = Message.prototype.encodeNB;
        
                    /**
                     * Directly encodes the message to a base64 encoded string.
                     * @name ProtoBuf.Builder.Message#encode64
                     * @function
                     * @return {string} Base64 encoded string
                     * @throws {Error} If the underlying buffer cannot be encoded or if required fields are missing. The later
                     *  still returns the encoded base64 string in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.encode64 = function() {
                        try {
                            return this.encode().toBase64();
                        } catch (err) {
                            if (err["encoded"]) err["encoded"] = err["encoded"].toBase64();
                            throw(err);
                        }
                    };
        
                    /**
                     * Returns the message as a base64 encoded string. This is an alias for {@link ProtoBuf.Builder.Message#encode64}.
                     * @name ProtoBuf.Builder.Message#toBase64
                     * @function
                     * @return {string} Base64 encoded string
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded base64 string in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.toBase64 = Message.prototype.encode64;
        
                    /**
                     * Directly encodes the message to a hex encoded string.
                     * @name ProtoBuf.Builder.Message#encodeHex
                     * @function
                     * @return {string} Hex encoded string
                     * @throws {Error} If the underlying buffer cannot be encoded or if required fields are missing. The later
                     *  still returns the encoded hex string in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.encodeHex = function() {
                        try {
                            return this.encode().toHex();
                        } catch (err) {
                            if (err["encoded"]) err["encoded"] = err["encoded"].toHex();
                            throw(err);
                        }
                    };
        
                    /**
                     * Returns the message as a hex encoded string. This is an alias for {@link ProtoBuf.Builder.Message#encodeHex}.
                     * @name ProtoBuf.Builder.Message#toHex
                     * @function
                     * @return {string} Hex encoded string
                     * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                     *  returns the encoded hex string in the `encoded` property on the error.
                     * @expose
                     */
                    Message.prototype.toHex = Message.prototype.encodeHex;
                    
                    /**
                     * Decodes a message from the specified buffer or string.
                     * @name ProtoBuf.Builder.Message.decode
                     * @function
                     * @param {!ByteBuffer|!ArrayBuffer|!Buffer|string} buffer Buffer to decode from
                     * @param {string=} enc Encoding if buffer is a string: hex, utf8 (not recommended), defaults to base64
                     * @return {!ProtoBuf.Builder.Message} Decoded message
                     * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                     *  returns the decoded message with missing fields in the `decoded` property on the error.
                     * @expose
                     * @see ProtoBuf.Builder.Message.decode64
                     * @see ProtoBuf.Builder.Message.decodeHex
                     */
                    Message.decode = function(buffer, enc) {
                        if (buffer === null) throw(new Error("buffer must not be null"));
                        if (typeof buffer === 'string') {
                            buffer = ByteBuffer.wrap(buffer, enc ? enc : "base64");
                        }
                        buffer = buffer instanceof ByteBuffer ? buffer : ByteBuffer.wrap(buffer); // May throw
                        var le = buffer.littleEndian;
                        try {
                            var msg = T.decode(buffer.LE());
                            buffer.LE(le);
                            return msg;
                        } catch (e) {
                            buffer.LE(le);
                            throw(e);
                        }
                    };
        
                    /**
                     * Decodes a varint32 length-delimited message from the specified buffer or string.
                     * @name ProtoBuf.Builder.Message.decodeDelimited
                     * @function
                     * @param {!ByteBuffer|!ArrayBuffer|!Buffer|string} buffer Buffer to decode from
                     * @param {string=} enc Encoding if buffer is a string: hex, utf8 (not recommended), defaults to base64
                     * @return {!ProtoBuf.Builder.Message} Decoded message
                     * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                     *  returns the decoded message with missing fields in the `decoded` property on the error.
                     * @expose
                     */
                    Message.decodeDelimited = function(buffer, enc) {
                        if (buffer === null) throw(new Error("buffer must not be null"));
                        if (typeof buffer === 'string') {
                            buffer = ByteBuffer.wrap(buffer, enc ? enc : "base64");
                        }
                        buffer = buffer instanceof ByteBuffer ? buffer : ByteBuffer.wrap(buffer); // May throw
                        var len = buffer.readVarint32();
                        var msg = T.decode(buffer.slice(buffer.offset, buffer.offset + len).LE());
                        buffer.offset += len;
                        return msg;
                    };
        
                    /**
                     * Decodes the message from the specified base64 encoded string.
                     * @name ProtoBuf.Builder.Message.decode64
                     * @function
                     * @param {string} str String to decode from
                     * @return {!ProtoBuf.Builder.Message} Decoded message
                     * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                     *  returns the decoded message with missing fields in the `decoded` property on the error.
                     * @expose
                     */
                    Message.decode64 = function(str) {
                        return Message.decode(str, "base64");
                    };
        
                    /**
                     * Decodes the message from the specified hex encoded string.
                     * @name ProtoBuf.Builder.Message.decodeHex
                     * @function
                     * @param {string} str String to decode from
                     * @return {!ProtoBuf.Builder.Message} Decoded message
                     * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                     *  returns the decoded message with missing fields in the `decoded` property on the error.
                     * @expose
                     */
                    Message.decodeHex = function(str) {
                        return Message.decode(str, "hex");
                    };
        
                    // Utility
        
                    /**
                     * Returns a string representation of this Message.
                     * @name ProtoBuf.Builder.Message#toString
                     * @function
                     * @return {string} String representation as of ".Fully.Qualified.MessageName"
                     * @expose
                     */
                    Message.prototype.toString = function() {
                        return T.toString();
                    };
        
                    // Static
                    
                    /**
                     * Options.
                     * @name ProtoBuf.Builder.Message.$options
                     * @type {Object.<string,*>}
                     * @expose
                     */
                    var O_o; // for cc
                    
                    if (Object.defineProperty) {
                        Object.defineProperty(Message, '$options', {
                            'value': T.buildOpt(),
                            'enumerable': false,
                            'configurable': false,
                            'writable': false
                        });
                    }
                    
                    return Message;
        
                })(ProtoBuf, this);
        
                // Static enums and prototyped sub-messages
                var children = this.getChildren();
                for (var i=0; i<children.length; i++) {
                    if (children[i] instanceof Enum) {
                        clazz[children[i]['name']] = children[i].build();
                    } else if (children[i] instanceof Message) {
                        clazz[children[i]['name']] = children[i].build();
                    } else if (children[i] instanceof Message.Field) {
                        // Ignore
                    } else {
                        throw(new Error("Illegal reflect child of "+this.toString(true)+": "+children[i].toString(true)));
                    }
                }
                return this.clazz = clazz;
            };
        
            /**
             * Encodes a runtime message's contents to the specified buffer.
             * @param {ProtoBuf.Builder.Message} message Runtime message to encode
             * @param {ByteBuffer} buffer ByteBuffer to write to
             * @return {ByteBuffer} The ByteBuffer for chaining
             * @throws {Error} If required fields are missing or the message cannot be encoded for another reason
             * @expose
             */
            Message.prototype.encode = function(message, buffer) {
                var fields = this.getChildren(Message.Field),
                    fieldMissing = null;
                for (var i=0; i<fields.length; i++) {
                    var val = message.$get(fields[i].name);
                    if (fields[i].required && val === null) {
                        if (fieldMissing === null) fieldMissing = fields[i];
                    } else {
                        fields[i].encode(val, buffer);
                    }
                }
                if (fieldMissing !== null) {
                    var err = new Error("Missing at least one required field for "+this.toString(true)+": "+fieldMissing);
                    err["encoded"] = buffer; // Still expose what we got
                    throw(err);
                }
                return buffer;
            };
        
            /**
             * Encodes a runtime message's varint32 length-delimitied contents to the specified buffer.
             * @param {ProtoBuf.Builder.Message} message Runtime message to encode
             * @param {ByteBuffer} buffer ByteBuffer to write to
             * @return {ByteBuffer} The ByteBffer for chaining
             * @throws {Error} If required fields are missing or the message cannot be encoded for anotzher reason
             * @expose
             */
            Message.prototype.encodeDelimitied = function(message, buffer) {
                var enc = new ByteBuffer();
                this.encode(message, enc);
                enc.flip();
                buffer.writeVarint32(enc.remaining());
                buffer.append(enc);
                return buffer;
            };
        
            /**
             * Decodes an encoded message and returns the decoded message.
             * @param {ByteBuffer} buffer ByteBuffer to decode from
             * @param {number=} length Message length. Defaults to decode all the available data.
             * @return {ProtoBuf.Builder.Message} Decoded message
             * @throws {Error} If the message cannot be decoded
             * @expose
             */
            Message.prototype.decode = function(buffer, length) {
                length = typeof length === 'number' ? length : -1;
                var start = buffer.offset;
                var msg = new (this.clazz)();
                while (buffer.offset < start+length || (length == -1 && buffer.remaining() > 0)) {
                    var tag = buffer.readVarint32();
                    var wireType = tag & 0x07,
                        id = tag >> 3;
                    var field = this.getChild(id); // Message.Field only
                    if (!field) {
                        // "messages created by your new code can be parsed by your old code: old binaries simply ignore the new field when parsing."
                        switch (wireType) {
                            case ProtoBuf.WIRE_TYPES.VARINT:
                                buffer.readVarint32();
                                break;
                            case ProtoBuf.WIRE_TYPES.BITS32:
                                buffer.offset += 4;
                                break;
                            case ProtoBuf.WIRE_TYPES.BITS64:
                                buffer.offset += 8;
                                break;
                            case ProtoBuf.WIRE_TYPES.LDELIM:
                                var len = buffer.readVarint32();
                                buffer.offset += len;
                                break;
                            default:
                                throw(new Error("Illegal wire type of unknown field "+id+" in "+this.toString(true)+"#decode: "+wireType));
                        }
                        continue;
                    }
                    if (field.repeated && !field.options["packed"]) {
                        msg.$add(field.name, field.decode(wireType, buffer), true);
                    } else {
                        msg.$set(field.name, field.decode(wireType, buffer), true);
                    }
                }
                // Check if all required fields are present
                var fields = this.getChildren(ProtoBuf.Reflect.Field);
                for (var i=0; i<fields.length; i++) {
                    if (fields[i].required && msg[fields[i].name] === null) {
                        var err = new Error("Missing at least one required field for "+this.toString(true)+": "+fields[i].name);
                        err["decoded"] = msg; // Still expose what we got
                        throw(err);
                    }
                }
                return msg;
            };
        
            /**
             * @alias ProtoBuf.Reflect.Message
             * @expose
             */
            Reflect.Message = Message;
        
            /**
             * Constructs a new Message Field.
             * @exports ProtoBuf.Reflect.Message.Field
             * @param {ProtoBuf.Reflect.Message} message Message reference
             * @param {string} rule Rule, one of requried, optional, repeated
             * @param {string} type Data type, e.g. int32
             * @param {string} name Field name
             * @param {number} id Unique field id
             * @param {Object.<string.*>=} options Options
             * @constructor
             * @extends ProtoBuf.Reflect.T
             */
            var Field = function(message, rule, type, name, id, options) {
                T.call(this, message, name);
        
                /**
                 * Message field required flag.
                 * @type {boolean}
                 * @expose
                 */
                this.required = rule == "required";
        
                /**
                 * Message field repeated flag.
                 * @type {boolean}
                 * @expose
                 */
                this.repeated = rule == "repeated";
        
                /**
                 * Message field type. Type reference string if unresolved, protobuf type if resolved.
                 * @type {string|{name: string, wireType: number}
                 * @expose
                 */
                this.type = type;
        
                /**
                 * Resolved type reference inside the global namespace.
                 * @type {ProtoBuf.Reflect.T|null}
                 * @expose
                 */
                this.resolvedType = null;
        
                /**
                 * Unique message field id.
                 * @type {number}
                 * @expose
                 */
                this.id = id;
        
                /**
                 * Message field options.
                 * @type {!Object.<string,*>}
                 * @dict
                 * @expose
                 */
                this.options = options || {};
        
                /**
                 * Original field name.
                 * @type {string}
                 * @expose
                 */
                this.originalName = this.name; // Used to revert camelcase transformation on naming collisions
                
                // Convert field names to camel case notation if the override is set
                if (ProtoBuf.convertFieldsToCamelCase) {
                    this.name = this.name.replace(/_([a-zA-Z])/g, function($0, $1) {
                        return $1.toUpperCase();
                    });
                }
            };
        
            // Extends T
            Field.prototype = Object.create(T.prototype);
        
            /**
             * Checks if the given value can be set for this field.
             * @param {*} value Value to check
             * @param {boolean=} skipRepeated Whether to skip the repeated value check or not. Defaults to false.
             * @return {*} Verified, maybe adjusted, value
             * @throws {Error} If the value cannot be set for this field
             * @expose
             */
            Field.prototype.verifyValue = function(value, skipRepeated) {
                skipRepeated = skipRepeated || false;
                if (value === null) { // NULL values for optional fields
                    if (this.required) {
                        throw(new Error("Illegal value for "+this.toString(true)+": "+value+" (required)"));
                    }
                    return null;
                }
                var i;
                if (this.repeated && !skipRepeated) { // Repeated values as arrays
                    if (!ProtoBuf.Util.isArray(value)) {
                        value = [value];
                    }
                    var res = [];
                    for (i=0; i<value.length; i++) {
                        res.push(this.verifyValue(value[i], true));
                    }
                    return res;
                }
                // All non-repeated fields expect no array
                if (!this.repeated && ProtoBuf.Util.isArray(value)) {
                    throw(new Error("Illegal value for "+this.toString(true)+": "+value+" (no array expected)"));
                }
                // Signed 32bit
                if (this.type == ProtoBuf.TYPES["int32"] || this.type == ProtoBuf.TYPES["sint32"] || this.type == ProtoBuf.TYPES["sfixed32"]) {
                    return isNaN(i = parseInt(value, 10)) ? i : i | 0; // Do not cast NaN as it'd become 0
                }
                // Unsigned 32bit
                if (this.type == ProtoBuf.TYPES["uint32"] || this.type == ProtoBuf.TYPES["fixed32"]) {
                    return isNaN(i = parseInt(value, 10)) ? i : i >>> 0; // Do not cast NaN as it'd become 0
                }
                if (ProtoBuf.Long) {
                    // Signed 64bit
                    if (this.type == ProtoBuf.TYPES["int64"] || this.type == ProtoBuf.TYPES["sint64"] || this.type == ProtoBuf.TYPES["sfixed64"]) {
                        if (!(typeof value == 'object' && value instanceof ProtoBuf.Long)) {
                            return ProtoBuf.Long.fromNumber(value, false);
                        }
                        return value.unsigned ? value.toSigned() : value;
                    }
                    // Unsigned 64bit
                    if (this.type == ProtoBuf.TYPES["uint64"] || this.type == ProtoBuf.TYPES["fixed64"]) {
                        if (!(typeof value == 'object' && value instanceof ProtoBuf.Long)) {
                            return ProtoBuf.Long.fromNumber(value, true);
                        }
                        return value.unsigned ? value : value.toUnsigned();
                    }
                }
                // Bool
                if (this.type == ProtoBuf.TYPES["bool"]) {
                    if (typeof value === 'string') return value === 'true';
                    else return !!value;
                }
                // Float
                if (this.type == ProtoBuf.TYPES["float"] || this.type == ProtoBuf.TYPES["double"]) {
                    return parseFloat(value); // May also become NaN, +Infinity, -Infinity
                }
                // Length-delimited string
                if (this.type == ProtoBuf.TYPES["string"]) {
                    return ""+value;
                }
                // Length-delimited bytes
                if (this.type == ProtoBuf.TYPES["bytes"]) {
                    if (value && value instanceof ByteBuffer) {
                        return value;
                    }
                    return ByteBuffer.wrap(value);
                }
                // Constant enum value
                if (this.type == ProtoBuf.TYPES["enum"]) {
                    var values = this.resolvedType.getChildren(Enum.Value);
                    for (i=0; i<values.length; i++) {
                        if (values[i].name == value) {
                            return values[i].id;
                        } else if (values[i].id == value) {
                            return values[i].id;
                        }
                    }
                    throw(new Error("Illegal value for "+this.toString(true)+": "+value+" (not a valid enum value)"));
                }
                // Embedded message
                if (this.type == ProtoBuf.TYPES["message"]) {
                    if (typeof value !== 'object') {
                        throw(new Error("Illegal value for "+this.toString(true)+": "+value+" (object expected)"));
                    }
                    if (value instanceof this.resolvedType.clazz) {
                        return value;
                    }
                    // Else let's try to construct one from a key-value object
                    return new (this.resolvedType.clazz)(value); // May throw for a hundred of reasons
                }
                // We should never end here
                throw(new Error("[INTERNAL] Illegal value for "+this.toString(true)+": "+value+" (undefined type "+this.type+")"));
            };
        
            /**
             * Encodes the specified field value to the specified buffer.
             * @param {*} value Field value
             * @param {ByteBuffer} buffer ByteBuffer to encode to
             * @return {ByteBuffer} The ByteBuffer for chaining
             * @throws {Error} If the field cannot be encoded
             * @expose
             */
            Field.prototype.encode = function(value, buffer) {
                value = this.verifyValue(value); // May throw
                if (this.type == null || typeof this.type != 'object') {
                    throw(new Error("[INTERNAL] Unresolved type in "+this.toString(true)+": "+this.type));
                }
                if (value === null || (this.repeated && value.length == 0)) return buffer; // Optional omitted
                try {
                    if (this.repeated) {
                        var i;
                        if (this.options["packed"]) {
                            // "All of the elements of the field are packed into a single key-value pair with wire type 2
                            // (length-delimited). Each element is encoded the same way it would be normally, except without a
                            // tag preceding it." 
                            buffer.writeVarint32((this.id << 3) | ProtoBuf.WIRE_TYPES.LDELIM);
                            buffer.ensureCapacity(buffer.offset += 1); // We do not know the length yet, so let's assume a varint of length 1
                            var start = buffer.offset; // Remember where the contents begin
                            for (i=0; i<value.length; i++) {
                                this.encodeValue(value[i], buffer);
                            }
                            var len = buffer.offset-start;
                            var varintLen = ByteBuffer.calculateVarint32(len);
                            if (varintLen > 1) { // We need to move the contents
                                var contents = buffer.slice(start, buffer.offset);
                                start += varintLen-1;
                                buffer.offset = start;
                                buffer.append(contents);
                            }
                            buffer.writeVarint32(len, start-varintLen);
                        } else {
                            // "If your message definition has repeated elements (without the [packed=true] option), the encoded
                            // message has zero or more key-value pairs with the same tag number"
                            for (i=0; i<value.length; i++) {
                                buffer.writeVarint32((this.id << 3) | this.type.wireType);
                                this.encodeValue(value[i], buffer);
                            }
                        }
                    } else {
                        buffer.writeVarint32((this.id << 3) | this.type.wireType);
                        this.encodeValue(value, buffer);
                    }
                } catch (e) {
                    throw(new Error("Illegal value for "+this.toString(true)+": "+value+" ("+e+")"));
                }
                return buffer;
            };
        
            /**
             * Encodes a value to the specified buffer. Does not encode the key.
             * @param {*} value Field value
             * @param {ByteBuffer} buffer ByteBuffer to encode to
             * @return {ByteBuffer} The ByteBuffer for chaining
             * @throws {Error} If the value cannot be encoded
             * @expose
             */
            Field.prototype.encodeValue = function(value, buffer) {
                if (value === null) return; // Nothing to encode
                // Tag has already been written
        
                // 32bit signed varint
                if (this.type == ProtoBuf.TYPES["int32"]) {
                    // "If you use int32 or int64 as the type for a negative number, the resulting varint is always ten bytes
                    // long – it is, effectively, treated like a very large unsigned integer." (see #122)
                    if (value < 0)
                        buffer.writeVarint64(value);
                    else
                        buffer.writeVarint32(value);
                    
                // 32bit unsigned varint
                } else if (this.type == ProtoBuf.TYPES["uint32"]) {
                    buffer.writeVarint32(value);
                    
                // 32bit varint zig-zag
                } else if (this.type == ProtoBuf.TYPES["sint32"]) {
                    buffer.writeZigZagVarint32(value);
                    
                // Fixed unsigned 32bit
                } else if (this.type == ProtoBuf.TYPES["fixed32"]) {
                    buffer.writeUint32(value);
                    
                // Fixed signed 32bit
                } else if (this.type == ProtoBuf.TYPES["sfixed32"]) {
                    buffer.writeInt32(value);
                
                // 64bit varint as-is
                } else if (this.type == ProtoBuf.TYPES["int64"] || this.type == ProtoBuf.TYPES["uint64"]) {
                    buffer.writeVarint64(value); // throws
                    
                // 64bit varint zig-zag
                } else if (this.type == ProtoBuf.TYPES["sint64"]) {
                    buffer.writeZigZagVarint64(value); // throws
                    
                // Fixed unsigned 64bit
                } else if (this.type == ProtoBuf.TYPES["fixed64"]) {
                    buffer.writeUint64(value); // throws
                    
                // Fixed signed 64bit
                } else if (this.type == ProtoBuf.TYPES["sfixed64"]) {
                    buffer.writeInt64(value); // throws
                    
                // Bool
                } else if (this.type == ProtoBuf.TYPES["bool"]) {
                    if (typeof value === 'string') buffer.writeVarint32(value.toLowerCase() === 'false' ? 0 : !!value);
                    else buffer.writeVarint32(value ? 1 : 0);
                    
                // Constant enum value
                } else if (this.type == ProtoBuf.TYPES["enum"]) {
                    buffer.writeVarint32(value);
                    
                // 32bit float
                } else if (this.type == ProtoBuf.TYPES["float"]) {
                    buffer.writeFloat32(value);
                    
                // 64bit float
                } else if (this.type == ProtoBuf.TYPES["double"]) {
                    buffer.writeFloat64(value);
                    
                // Length-delimited string
                } else if (this.type == ProtoBuf.TYPES["string"]) {
                    buffer.writeVString(value);
                    
                // Length-delimited bytes
                } else if (this.type == ProtoBuf.TYPES["bytes"]) {
                    if (value.offset > value.length) { // Forgot to flip?
                        buffer = buffer.clone().flip();
                    }
                    buffer.writeVarint32(value.remaining());
                    buffer.append(value);
                    
                // Embedded message
                } else if (this.type == ProtoBuf.TYPES["message"]) {
                    var bb = new ByteBuffer().LE();
                    this.resolvedType.encode(value, bb);
                    buffer.writeVarint32(bb.offset);
                    buffer.append(bb.flip());
                } else {
                    // We should never end here
                    throw(new Error("[INTERNAL] Illegal value to encode in "+this.toString(true)+": "+value+" (unknown type)"));
                }
                return buffer;
            };
        
            /**
             * Decode the field value from the specified buffer.
             * @param {number} wireType Leading wire type
             * @param {ByteBuffer} buffer ByteBuffer to decode from
             * @param {boolean=} skipRepeated Whether to skip the repeated check or not. Defaults to false.
             * @return {*} Decoded value
             * @throws {Error} If the field cannot be decoded
             * @expose
             */
            Field.prototype.decode = function(wireType, buffer, skipRepeated) {
                var value, nBytes;
                if (wireType != this.type.wireType && (skipRepeated || (wireType != ProtoBuf.WIRE_TYPES.LDELIM || !this.repeated))) {
                    throw(new Error("Illegal wire type for field "+this.toString(true)+": "+wireType+" ("+this.type.wireType+" expected)"));
                }
                if (wireType == ProtoBuf.WIRE_TYPES.LDELIM && this.repeated && this.options["packed"]) {
                    if (!skipRepeated) {
                        nBytes = buffer.readVarint32();
                        nBytes = buffer.offset + nBytes; // Limit
                        var values = [];
                        while (buffer.offset < nBytes) {
                            values.push(this.decode(this.type.wireType, buffer, true));
                        }
                        return values;
                    }
                    // Read the next value otherwise...
                    
                }
                // 32bit signed varint
                if (this.type == ProtoBuf.TYPES["int32"]) {
                    return buffer.readVarint32() | 0;
                }
                
                // 32bit unsigned varint
                if (this.type == ProtoBuf.TYPES["uint32"]) {
                    return buffer.readVarint32() >>> 0;
                }
                
                // 32bit signed varint zig-zag
                if (this.type == ProtoBuf.TYPES["sint32"]) {
                    return buffer.readZigZagVarint32() | 0;
                }
                
                // Fixed 32bit unsigned
                if (this.type == ProtoBuf.TYPES["fixed32"]) {
                    return buffer.readUint32() >>> 0;
                }
                
                // Fixed 32bit signed
                if (this.type == ProtoBuf.TYPES["sfixed32"]) {
                    return buffer.readInt32() | 0;
                }
                
                // 64bit signed varint
                if (this.type == ProtoBuf.TYPES["int64"]) {
                    return buffer.readVarint64();
                }
                
                // 64bit unsigned varint
                if (this.type == ProtoBuf.TYPES["uint64"]) {
                    return buffer.readVarint64().toUnsigned();
                }
                
                // 64bit signed varint zig-zag
                if (this.type == ProtoBuf.TYPES["sint64"]) {
                    return buffer.readZigZagVarint64();
                }
        
                // Fixed 64bit unsigned
                if (this.type == ProtoBuf.TYPES["fixed64"]) {
                    return buffer.readUint64();
                }
                
                // Fixed 64bit signed
                if (this.type == ProtoBuf.TYPES["sfixed64"]) {
                    return buffer.readInt64();
                }
                
                // Bool varint
                if (this.type == ProtoBuf.TYPES["bool"]) {
                    return !!buffer.readVarint32();
                }
                
                // Constant enum value varint)
                if (this.type == ProtoBuf.TYPES["enum"]) {
                    return buffer.readVarint32(); // The following Builder.Message#set will already throw
                }
                
                // 32bit float
                if (this.type == ProtoBuf.TYPES["float"]) {
                    return buffer.readFloat();
                }
                // 64bit float
                if (this.type == ProtoBuf.TYPES["double"]) {
                    return buffer.readDouble();
                }
                
                // Length-delimited string
                if (this.type == ProtoBuf.TYPES["string"]){
                    return buffer.readVString();
                }
                
                // Length-delimited bytes
                if (this.type == ProtoBuf.TYPES["bytes"]) {
                    nBytes = buffer.readVarint32();
                    if (buffer.remaining() < nBytes) {
                        throw(new Error("Illegal number of bytes for "+this.toString(true)+": "+nBytes+" required but got only "+buffer.remaining()));
                    }
                    value = buffer.clone(); // Offset already set
                    value.length = value.offset+nBytes;
                    buffer.offset += nBytes;
                    return value;
                }
                
                // Length-delimited embedded message
                if (this.type == ProtoBuf.TYPES["message"]) {
                    nBytes = buffer.readVarint32();
                    return this.resolvedType.decode(buffer, nBytes);
                }
                
                // We should never end here
                throw(new Error("[INTERNAL] Illegal wire type for "+this.toString(true)+": "+wireType));
            };
        
            /**
             * @alias ProtoBuf.Reflect.Message.Field
             * @expose
             */
            Reflect.Message.Field = Field;
        
            /**
             * Constructs a new Enum.
             * @exports ProtoBuf.Reflect.Enum
             * @param {!ProtoBuf.Reflect.T} parent Parent Reflect object
             * @param {string} name Enum name
             * @param {Object.<string.*>=} options Enum options
             * @constructor
             * @extends ProtoBuf.Reflect.Namespace
             */
            var Enum = function(parent, name, options) {
                Namespace.call(this, parent, name, options);
        
                /**
                 * Runtime enum object.
                 * @type {Object.<string,number>|null}
                 * @expose
                 */
                this.object = null;
            };
        
            // Extends Namespace
            Enum.prototype = Object.create(Namespace.prototype);
        
            /**
             * Builds this enum and returns the runtime counterpart.
             * @return {Object<string,*>}
             * @expose
             */
            Enum.prototype.build = function() {
                var enm = {};
                var values = this.getChildren(Enum.Value);
                for (var i=0; i<values.length; i++) {
                    enm[values[i]['name']] = values[i]['id'];
                }
                if (Object.defineProperty) {
                    Object.defineProperty(enm, '$options', {
                        'value': this.buildOpt(),
                        'enumerable': false,
                        'configurable': false,
                        'writable': false
                    });
                }
                return this.object = enm;
            };
        
            /**
             * @alias ProtoBuf.Reflect.Enum
             * @expose
             */
            Reflect.Enum = Enum;
        
            /**
             * Constructs a new Enum Value.
             * @exports ProtoBuf.Reflect.Enum.Value
             * @param {!ProtoBuf.Reflect.Enum} enm Enum reference
             * @param {string} name Field name
             * @param {number} id Unique field id
             * @constructor
             * @extends ProtoBuf.Reflect.T
             */
            var Value = function(enm, name, id) {
                T.call(this, enm, name);
        
                /**
                 * Unique enum value id.
                 * @type {number}
                 * @expose
                 */
                this.id = id;
            };
        
            // Extends T
            Value.prototype = Object.create(T.prototype);
        
            /**
             * @alias ProtoBuf.Reflect.Enum.Value
             * @expose
             */
            Reflect.Enum.Value = Value;
        
            /**
             * Constructs a new Service.
             * @exports ProtoBuf.Reflect.Service
             * @param {!ProtoBuf.Reflect.Namespace} root Root
             * @param {string} name Service name
             * @param {Object.<string,*>=} options Options
             * @constructor
             * @extends ProtoBuf.Reflect.Namespace
             */
            var Service = function(root, name, options) {
                Namespace.call(this, root, name, options);
        
                /**
                 * Built runtime service class.
                 * @type {?function(new:ProtoBuf.Builder.Service)}
                 */
                this.clazz = null;
            };
            
            // Extends Namespace
            Service.prototype = Object.create(Namespace.prototype);
        
            /**
             * Builds the service and returns the runtime counterpart, which is a fully functional class.
             * @see ProtoBuf.Builder.Service
             * @param {boolean=} rebuild Whether to rebuild or not
             * @return {Function} Service class
             * @throws {Error} If the message cannot be built
             * @expose
             */
            Service.prototype.build = function(rebuild) {
                if (this.clazz && !rebuild) return this.clazz;
                return this.clazz = (function(ProtoBuf, T) {
        
                    /**
                     * Constructs a new runtime Service.
                     * @name ProtoBuf.Builder.Service
                     * @param {function(string, ProtoBuf.Builder.Message, function(Error, ProtoBuf.Builder.Message=))=} rpcImpl RPC implementation receiving the method name and the message
                     * @class Barebone of all runtime services.
                     * @constructor
                     * @throws {Error} If the service cannot be created
                     */
                    var Service = function(rpcImpl) {
                        ProtoBuf.Builder.Service.call(this);
        
                        /**
                         * Service implementation.
                         * @name ProtoBuf.Builder.Service#rpcImpl
                         * @type {!function(string, ProtoBuf.Builder.Message, function(Error, ProtoBuf.Builder.Message=))}
                         * @expose
                         */
                        this.rpcImpl = rpcImpl || function(name, msg, callback) {
                            // This is what a user has to implement: A function receiving the method name, the actual message to
                            // send (type checked) and the callback that's either provided with the error as its first
                            // argument or null and the actual response message.
                            setTimeout(callback.bind(this, new Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")), 0); // Must be async!
                        };
                    };
                    
                    // Extends ProtoBuf.Builder.Service
                    Service.prototype = Object.create(ProtoBuf.Builder.Service.prototype);
                    
                    if (Object.defineProperty) {
                        Object.defineProperty(Service, "$options", {
                            "value": T.buildOpt(),
                            "enumerable": false,
                            "configurable": false,
                            "writable": false
                        });
                        Object.defineProperty(Service.prototype, "$options", {
                            "value": Service["$options"],
                            "enumerable": false,
                            "configurable": false,
                            "writable": false
                        });
                    }
        
                    /**
                     * Asynchronously performs an RPC call using the given RPC implementation.
                     * @name ProtoBuf.Builder.Service.[Method]
                     * @function
                     * @param {!function(string, ProtoBuf.Builder.Message, function(Error, ProtoBuf.Builder.Message=))} rpcImpl RPC implementation
                     * @param {ProtoBuf.Builder.Message} req Request
                     * @param {function(Error, (ProtoBuf.Builder.Message|ByteBuffer|Buffer|string)=)} callback Callback receiving
                     *  the error if any and the response either as a pre-parsed message or as its raw bytes
                     * @abstract
                     */
        
                    /**
                     * Asynchronously performs an RPC call using the instance's RPC implementation.
                     * @name ProtoBuf.Builder.Service#[Method]
                     * @function
                     * @param {ProtoBuf.Builder.Message} req Request
                     * @param {function(Error, (ProtoBuf.Builder.Message|ByteBuffer|Buffer|string)=)} callback Callback receiving
                     *  the error if any and the response either as a pre-parsed message or as its raw bytes
                     * @abstract
                     */
                    
                    var rpc = T.getChildren(Reflect.Service.RPCMethod);
                    for (var i=0; i<rpc.length; i++) {
                        (function(method) {
                            
                            // service#Method(message, callback)
                            Service.prototype[method.name] = function(req, callback) {
                                try {
                                    if (!req || !(req instanceof method.resolvedRequestType.clazz)) {
                                        setTimeout(callback.bind(this, new Error("Illegal request type provided to service method "+T.name+"#"+method.name)));
                                    }
                                    this.rpcImpl(method.fqn(), req, function(err, res) { // Assumes that this is properly async
                                        if (err) {
                                            callback(err);
                                            return;
                                        }
                                        try { res = method.resolvedResponseType.clazz.decode(res); } catch (notABuffer) {}
                                        if (!res || !(res instanceof method.resolvedResponseType.clazz)) {
                                            callback(new Error("Illegal response type received in service method "+ T.name+"#"+method.name));
                                            return;
                                        }
                                        callback(null, res);
                                    });
                                } catch (err) {
                                    setTimeout(callback.bind(this, err), 0);
                                }
                            };
        
                            // Service.Method(rpcImpl, message, callback)
                            Service[method.name] = function(rpcImpl, req, callback) {
                                new Service(rpcImpl)[method.name](req, callback);
                            };
        
                            if (Object.defineProperty) {
                                Object.defineProperty(Service[method.name], "$options", {
                                    "value": method.buildOpt(),
                                    "enumerable": false,
                                    "configurable": false,
                                    "writable": false
                                });
                                Object.defineProperty(Service.prototype[method.name], "$options", {
                                    "value": Service[method.name]["$options"],
                                    "enumerable": false,
                                    "configurable": false,
                                    "writable": false
                                });
                            }
                        })(rpc[i]);
                    }
                    
                    return Service;
                    
                })(ProtoBuf, this);
            };
            
            Reflect.Service = Service;
        
            /**
             * Abstract service method.
             * @exports ProtoBuf.Reflect.Service.Method
             * @param {!ProtoBuf.Reflect.Service} svc Service
             * @param {string} name Method name
             * @param {Object.<string,*>=} options Options
             * @constructor
             * @extends ProtoBuf.Reflect.T
             */
            var Method = function(svc, name, options) {
                T.call(this, svc, name);
        
                /**
                 * Options.
                 * @type {Object.<string, *>}
                 * @expose
                 */
                this.options = options || {};
            };
            
            // Extends T
            Method.prototype = Object.create(T.prototype);
        
            /**
             * Builds the method's '$options' property.
             * @name ProtoBuf.Reflect.Service.Method#buildOpt
             * @function
             * @return {Object.<string,*>}
             */
            Method.prototype.buildOpt = Namespace.prototype.buildOpt;
        
            /**
             * @alias ProtoBuf.Reflect.Service.Method
             * @expose
             */
            Reflect.Service.Method = Method;
        
            /**
             * RPC service method.
             * @exports ProtoBuf.Reflect.Service.RPCMethod
             * @param {!ProtoBuf.Reflect.Service} svc Service
             * @param {string} name Method name
             * @param {string} request Request message name
             * @param {string} response Response message name
             * @param {Object.<string,*>=} options Options
             * @constructor
             * @extends ProtoBuf.Reflect.Service.Method
             */
            var RPCMethod = function(svc, name, request, response, options) {
                Method.call(this, svc, name, options);
        
                /**
                 * Request message name.
                 * @type {string}
                 * @expose
                 */
                this.requestName = request;
        
                /**
                 * Response message name.
                 * @type {string}
                 * @expose
                 */
                this.responseName = response;
        
                /**
                 * Resolved request message type.
                 * @type {ProtoBuf.Reflect.Message}
                 * @expose
                 */
                this.resolvedRequestType = null;
        
                /**
                 * Resolved response message type.
                 * @type {ProtoBuf.Reflect.Message}
                 * @expose
                 */
                this.resolvedResponseType = null;
            };
            
            // Extends Method
            RPCMethod.prototype = Object.create(Method.prototype);
        
            /**
             * @alias ProtoBuf.Reflect.Service.RPCMethod
             * @expose
             */
            Reflect.Service.RPCMethod = RPCMethod;
            
            return Reflect;
        })(ProtoBuf);
                
        /**
         * @alias ProtoBuf.Builder
         * @expose
         */
        ProtoBuf.Builder = (function(ProtoBuf, Lang, Reflect) {
            "use strict";
            
            /**
             * Constructs a new Builder.
             * @exports ProtoBuf.Builder
             * @class Provides the functionality to build protocol messages.
             * @constructor
             */
            var Builder = function() {
        
                /**
                 * Namespace.
                 * @type {ProtoBuf.Reflect.Namespace}
                 * @expose
                 */
                this.ns = new Reflect.Namespace(null, ""); // Global namespace
        
                /**
                 * Namespace pointer.
                 * @type {ProtoBuf.Reflect.T}
                 * @expose
                 */
                this.ptr = this.ns;
        
                /**
                 * Resolved flag.
                 * @type {boolean}
                 * @expose
                 */
                this.resolved = false;
        
                /**
                 * The current building result.
                 * @type {Object.<string,ProtoBuf.Builder.Message|Object>|null}
                 * @expose
                 */
                this.result = null;
        
                /**
                 * Imported files.
                 * @type {Array.<string>}
                 * @expose
                 */
                this.files = {};
        
                /**
                 * Import root override.
                 * @type {?string}
                 * @expose
                 */
                this.importRoot = null;
            };
        
            /**
             * Resets the pointer to the global namespace.
             * @expose
             */
            Builder.prototype.reset = function() {
                this.ptr = this.ns;
            };
        
            /**
             * Defines a package on top of the current pointer position and places the pointer on it.
             * @param {string} pkg
             * @param {Object.<string,*>=} options
             * @return {ProtoBuf.Builder} this
             * @throws {Error} If the package name is invalid
             * @expose
             */
            Builder.prototype.define = function(pkg, options) {
                if (typeof pkg !== 'string' || !Lang.TYPEREF.test(pkg)) {
                    throw(new Error("Illegal package name: "+pkg));
                }
                var part = pkg.split("."), i;
                for (i=0; i<part.length; i++) { // To be absolutely sure
                    if (!Lang.NAME.test(part[i])) {
                        throw(new Error("Illegal package name: "+part[i]));
                    }
                }
                for (i=0; i<part.length; i++) {
                    if (!this.ptr.hasChild(part[i])) { // Keep existing namespace
                        this.ptr.addChild(new Reflect.Namespace(this.ptr, part[i], options));
                    }
                    this.ptr = this.ptr.getChild(part[i]);
                }
                return this;
            };
        
            /**
             * Tests if a definition is a valid message definition.
             * @param {Object.<string,*>} def Definition
             * @return {boolean} true if valid, else false
             * @expose
             */
            Builder.isValidMessage = function(def) {
                // Messages require a string name
                if (typeof def["name"] !== 'string' || !Lang.NAME.test(def["name"])) {
                    return false;
                }
                // Messages must not contain values (that'd be an enum) or methods (that'd be a service)
                if (typeof def["values"] !== 'undefined' || typeof def["rpc"] !== 'undefined') {
                    return false;
                }
                // Fields, enums and messages are arrays if provided
                var i;
                if (typeof def["fields"] !== 'undefined') {
                    if (!ProtoBuf.Util.isArray(def["fields"])) {
                        return false;
                    }
                    var ids = [], id; // IDs must be unique
                    for (i=0; i<def["fields"].length; i++) {
                        if (!Builder.isValidMessageField(def["fields"][i])) {
                            return false;
                        }
                        id = parseInt(def["fields"][i]["id"], 10);
                        if (ids.indexOf(id) >= 0) {
                            return false;
                        }
                        ids.push(id);
                    }
                    ids = null;
                }
                if (typeof def["enums"] !== 'undefined') {
                    if (!ProtoBuf.Util.isArray(def["enums"])) {
                        return false;
                    }
                    for (i=0; i<def["enums"].length; i++) {
                        if (!Builder.isValidEnum(def["enums"][i])) {
                            return false;
                        }
                    }
                }
                if (typeof def["messages"] !== 'undefined') {
                    if (!ProtoBuf.Util.isArray(def["messages"])) {
                        return false;
                    }
                    for (i=0; i<def["messages"].length; i++) {
                        if (!Builder.isValidMessage(def["messages"][i]) && !Builder.isValidExtend(def["messages"][i])) {
                            return false;
                        }
                    }
                }
                if (typeof def["extensions"] !== 'undefined') {
                    if (!ProtoBuf.Util.isArray(def["extensions"]) || def["extensions"].length !== 2 || typeof def["extensions"][0] !== 'number' || typeof def["extensions"][1] !== 'number') {
                        return false;
                    }
                }
                return true;
            };
        
            /**
             * Tests if a definition is a valid message field definition.
             * @param {Object} def Definition
             * @return {boolean} true if valid, else false
             * @expose
             */
            Builder.isValidMessageField = function(def) {
                // Message fields require a string rule, name and type and an id
                if (typeof def["rule"] !== 'string' || typeof def["name"] !== 'string' || typeof def["type"] !== 'string' || typeof def["id"] === 'undefined') {
                    return false;
                }
                if (!Lang.RULE.test(def["rule"]) || !Lang.NAME.test(def["name"]) || !Lang.TYPEREF.test(def["type"]) || !Lang.ID.test(""+def["id"])) {
                    return false;
                }
                if (typeof def["options"] != 'undefined') {
                    // Options are objects
                    if (typeof def["options"] != 'object') {
                        return false;
                    }
                    // Options are <string,*>
                    var keys = Object.keys(def["options"]);
                    for (var i=0; i<keys.length; i++) {
                        if (!Lang.OPTNAME.test(keys[i]) || (typeof def["options"][keys[i]] !== 'string' && typeof def["options"][keys[i]] !== 'number' && typeof def["options"][keys[i]] !== 'boolean')) {
                            return false;
                        }
                    }
                }
                return true;
            };
        
            /**
             * Tests if a definition is a valid enum definition.
             * @param {Object} def Definition
             * @return {boolean} true if valid, else false
             * @expose
             */
            Builder.isValidEnum = function(def) {
                // Enums require a string name
                if (typeof def["name"] !== 'string' || !Lang.NAME.test(def["name"])) {
                    return false;
                }
                // Enums require at least one value
                if (typeof def["values"] === 'undefined' || !ProtoBuf.Util.isArray(def["values"]) || def["values"].length == 0) {
                    return false;
                }
                for (var i=0; i<def["values"].length; i++) {
                    // Values are objects
                    if (typeof def["values"][i] != "object") {
                        return false;
                    }
                    // Values require a string name and an id
                    if (typeof def["values"][i]["name"] !== 'string' || typeof def["values"][i]["id"] === 'undefined') {
                        return false;
                    }
                    if (!Lang.NAME.test(def["values"][i]["name"]) || !Lang.NEGID.test(""+def["values"][i]["id"])) {
                        return false;
                    }
                }
                // It's not important if there are other fields because ["values"] is already unique
                return true;
            };
        
            /**
             * Creates ths specified protocol types at the current pointer position.
             * @param {Array.<Object.<string,*>>} defs Messages, enums or services to create
             * @return {ProtoBuf.Builder} this
             * @throws {Error} If a message definition is invalid
             * @expose
             */
            Builder.prototype.create = function(defs) {
                if (!defs) return; // Nothing to create
                if (!ProtoBuf.Util.isArray(defs)) {
                    defs = [defs];
                }
                if (defs.length == 0) return;
                
                // It's quite hard to keep track of scopes and memory here, so let's do this iteratively.
                var stack = [], def, obj, subObj, i, j;
                stack.push(defs); // One level [a, b, c]
                while (stack.length > 0) {
                    defs = stack.pop();
                    if (ProtoBuf.Util.isArray(defs)) { // Stack always contains entire namespaces
                        while (defs.length > 0) {
                            def = defs.shift(); // Namespace always contains an array of messages, enums and services
                            if (Builder.isValidMessage(def)) {
                                obj = new Reflect.Message(this.ptr, def["name"], def["options"]);
                                // Create fields
                                if (def["fields"] && def["fields"].length > 0) {
                                    for (i=0; i<def["fields"].length; i++) { // i=Fields
                                        if (obj.hasChild(def['fields'][i]['id'])) {
                                            throw(new Error("Duplicate field id in message "+obj.name+": "+def['fields'][i]['id']));
                                        }
                                        if (def["fields"][i]["options"]) {
                                            subObj = Object.keys(def["fields"][i]["options"]);
                                            for (j=0; j<subObj.length; j++) { // j=Option names
                                                if (!Lang.OPTNAME.test(subObj[j])) {
                                                    throw(new Error("Illegal field option name in message "+obj.name+"#"+def["fields"][i]["name"]+": "+subObj[j]));
                                                }
                                                if (typeof def["fields"][i]["options"][subObj[j]] !== 'string' && typeof def["fields"][i]["options"][subObj[j]] !== 'number' && typeof def["fields"][i]["options"][subObj[j]] !== 'boolean') {
                                                    throw(new Error("Illegal field option value in message "+obj.name+"#"+def["fields"][i]["name"]+"#"+subObj[j]+": "+def["fields"][i]["options"][subObj[j]]));
                                                }
                                            }
                                            subObj = null;
                                        }
                                        obj.addChild(new Reflect.Message.Field(obj, def["fields"][i]["rule"], def["fields"][i]["type"], def["fields"][i]["name"], def["fields"][i]["id"], def["fields"][i]["options"]));
                                    }
                                }
                                // Push enums and messages to stack
                                subObj = [];
                                if (typeof def["enums"] !== 'undefined' && def['enums'].length > 0) {
                                    for (i=0; i<def["enums"].length; i++) {
                                        subObj.push(def["enums"][i]);
                                    }
                                }
                                if (def["messages"] && def["messages"].length > 0) {
                                    for (i=0; i<def["messages"].length; i++) {
                                        subObj.push(def["messages"][i]);
                                    }
                                }
                                // Set extension range
                                if (def["extensions"]) {
                                    obj.extensions = def["extensions"];
                                    if (obj.extensions[0] < ProtoBuf.Lang.ID_MIN) {
                                        obj.extensions[0] = ProtoBuf.Lang.ID_MIN;
                                    }
                                    if (obj.extensions[1] > ProtoBuf.Lang.ID_MAX) {
                                        obj.extensions[1] = ProtoBuf.Lang.ID_MAX;
                                    }
                                }
                                this.ptr.addChild(obj); // Add to current namespace
                                if (subObj.length > 0) {
                                    stack.push(defs); // Push the current level back
                                    defs = subObj; // Continue processing sub level
                                    subObj = null;
                                    this.ptr = obj; // And move the pointer to this namespace
                                    obj = null;
                                    continue;
                                }
                                subObj = null;
                                obj = null;
                            } else if (Builder.isValidEnum(def)) {
                                obj = new Reflect.Enum(this.ptr, def["name"], def["options"]);
                                for (i=0; i<def["values"].length; i++) {
                                    obj.addChild(new Reflect.Enum.Value(obj, def["values"][i]["name"], def["values"][i]["id"]));
                                }
                                this.ptr.addChild(obj);
                                obj = null;
                            } else if (Builder.isValidService(def)) {
                                obj = new Reflect.Service(this.ptr, def["name"], def["options"]);
                                for (i in def["rpc"]) {
                                    if (def["rpc"].hasOwnProperty(i)) {
                                        obj.addChild(new Reflect.Service.RPCMethod(obj, i, def["rpc"][i]["request"], def["rpc"][i]["response"], def["rpc"][i]["options"]));
                                    }
                                }
                                this.ptr.addChild(obj);
                                obj = null;
                            } else if (Builder.isValidExtend(def)) {
                                obj = this.ptr.resolve(def["ref"]);
                                if (obj) {
                                    for (i=0; i<def["fields"].length; i++) { // i=Fields
                                        if (obj.hasChild(def['fields'][i]['id'])) {
                                            throw(new Error("Duplicate extended field id in message "+obj.name+": "+def['fields'][i]['id']));
                                        }
                                        if (def['fields'][i]['id'] < obj.extensions[0] || def['fields'][i]['id'] > obj.extensions[1]) {
                                            throw(new Error("Illegal extended field id in message "+obj.name+": "+def['fields'][i]['id']+" ("+obj.extensions.join(' to ')+" expected)"));
                                        }
                                        obj.addChild(new Reflect.Message.Field(obj, def["fields"][i]["rule"], def["fields"][i]["type"], def["fields"][i]["name"], def["fields"][i]["id"], def["fields"][i]["options"]));
                                    }
                                    /* if (this.ptr instanceof Reflect.Message) {
                                        this.ptr.addChild(obj); // Reference the extended message here to enable proper lookups
                                    } */
                                } else {
                                    if (!/\.?google\.protobuf\./.test(def["ref"])) { // Silently skip internal extensions
                                        throw(new Error("Extended message "+def["ref"]+" is not defined"));
                                    }
                                }
                            } else {
                                throw(new Error("Not a valid message, enum, service or extend definition: "+JSON.stringify(def)));
                            }
                            def = null;
                        }
                        // Break goes here
                    } else {
                        throw(new Error("Not a valid namespace definition: "+JSON.stringify(defs)));
                    }
                    defs = null;
                    this.ptr = this.ptr.parent; // This namespace is s done
                }
                this.resolved = false; // Require re-resolve
                this.result = null; // Require re-build
                return this;
            };
        
            /**
             * Tests if the specified file is a valid import.
             * @param {string} filename
             * @returns {boolean} true if valid, false if it should be skipped
             * @expose
             */
            Builder.isValidImport = function(filename) {
                // Ignore google/protobuf/descriptor.proto (for example) as it makes use of low-level
                // bootstrapping directives that are not required and therefore cannot be parsed by ProtoBuf.js.
                return !(/google\/protobuf\//.test(filename));
            };
        
            /**
             * Imports another definition into this builder.
             * @param {Object.<string,*>} json Parsed import
             * @param {(string|{root: string, file: string})=} filename Imported file name
             * @return {ProtoBuf.Builder} this
             * @throws {Error} If the definition or file cannot be imported
             * @expose
             */
            Builder.prototype["import"] = function(json, filename) {
                if (typeof filename === 'string') {
                    if (ProtoBuf.Util.IS_NODE) {
                        var path = require("path");
                        filename = path.resolve(filename);
                    }
                    if (!!this.files[filename]) {
                        this.reset();
                        return this; // Skip duplicate imports
                    }
                    this.files[filename] = true;
                }
                if (!!json['imports'] && json['imports'].length > 0) {
                    var importRoot, delim = '/', resetRoot = false;
                    if (typeof filename === 'object') { // If an import root is specified, override
                        this.importRoot = filename["root"]; resetRoot = true; // ... and reset afterwards
                        importRoot = this.importRoot;
                        filename = filename["file"];
                        if (importRoot.indexOf("\\") >= 0 || filename.indexOf("\\") >= 0) delim = '\\';
                    } else if (typeof filename === 'string') {
                        if (this.importRoot) { // If import root is overridden, use it
                            importRoot = this.importRoot;
                        } else { // Otherwise compute from filename
                            if (filename.indexOf("/") >= 0) { // Unix
                                importRoot = filename.replace(/\/[^\/]*$/, "");
                                if (/* /file.proto */ importRoot === "") importRoot = "/";
                            } else if (filename.indexOf("\\") >= 0) { // Windows
                                importRoot = filename.replace(/\\[^\\]*$/, ""); delim = '\\';
                            } else {
                                importRoot = ".";
                            }
                        }
                    } else {
                        importRoot = null;
                    }
        
                    for (var i=0; i<json['imports'].length; i++) {
                        if (typeof json['imports'][i] === 'string') { // Import file
                            if (!importRoot) {
                                throw(new Error("Cannot determine import root: File name is unknown"));
                            }
                            var importFilename = importRoot+delim+json['imports'][i];
                            if (!Builder.isValidImport(importFilename)) continue; // e.g. google/protobuf/*
                            if (/\.proto$/i.test(importFilename) && !ProtoBuf.DotProto) {     // If this is a NOPARSE build
                                importFilename = importFilename.replace(/\.proto$/, ".json"); // always load the JSON file
                            }
                            var contents = ProtoBuf.Util.fetch(importFilename);
                            if (contents === null) {
                                throw(new Error("Failed to import '"+importFilename+"' in '"+filename+"': File not found"));
                            }
                            if (/\.json$/i.test(importFilename)) { // Always possible
                                this["import"](JSON.parse(contents+""), importFilename); // May throw
                            } else {
                                this["import"]((new ProtoBuf.DotProto.Parser(contents+"")).parse(), importFilename); // May throw
                            }
                        } else { // Import structure
                            if (!filename) {
                                this["import"](json['imports'][i]);
                            } else if (/\.(\w+)$/.test(filename)) { // With extension: Append _importN to the name portion to make it unique
                                this["import"](json['imports'][i], filename.replace(/^(.+)\.(\w+)$/, function($0, $1, $2) { return $1+"_import"+i+"."+$2; }));
                            } else { // Without extension: Append _importN to make it unique
                                this["import"](json['imports'][i], filename+"_import"+i);
                            }
                        }
                    }
                    if (resetRoot) { // Reset import root override when all imports are done
                        this.importRoot = null;
                    }
                }
                if (!!json['messages']) {
                    if (!!json['package']) this.define(json['package'], json["options"]);
                    this.create(json['messages']);
                    this.reset();
                }
                if (!!json['enums']) {
                    if (!!json['package']) this.define(json['package'], json["options"]);
                    this.create(json['enums']);
                    this.reset();
                }
                if (!!json['services']) {
                    if (!!json['package']) this.define(json['package'], json["options"]);
                    this.create(json['services']);
                    this.reset();
                }
                if (!!json['extends']) {
                    if (!!json['package']) this.define(json['package'], json["options"]);
                    this.create(json['extends']);
                    this.reset();
                }
                return this;
            };
        
            /**
             * Tests if a definition is a valid service definition.
             * @param {Object} def Definition
             * @return {boolean} true if valid, else false
             * @expose
             */
            Builder.isValidService = function(def) {
                // Services require a string name
                if (typeof def["name"] !== 'string' || !Lang.NAME.test(def["name"]) || typeof def["rpc"] !== 'object') {
                    return false;
                }
                return true;
            };
        
            /**
             * Tests if a definition is a valid extension.
             * @param {Object} def Definition
             * @returns {boolean} true if valid, else false
             * @expose
            */
            Builder.isValidExtend = function(def) {
                if (typeof def["ref"] !== 'string' || !Lang.TYPEREF.test(def["name"])) {
                    return false;
                }
                var i;
                if (typeof def["fields"] !== 'undefined') {
                    if (!ProtoBuf.Util.isArray(def["fields"])) {
                        return false;
                    }
                    var ids = [], id; // IDs must be unique (does not yet test for the extended message's ids)
                    for (i=0; i<def["fields"].length; i++) {
                        if (!Builder.isValidMessageField(def["fields"][i])) {
                            return false;
                        }
                        id = parseInt(def["id"], 10);
                        if (ids.indexOf(id) >= 0) {
                            return false;
                        }
                        ids.push(id);
                    }
                    ids = null;
                }
                return true;
            };
        
            /**
             * Resolves all namespace objects.
             * @throws {Error} If a type cannot be resolved
             * @expose
             */
            Builder.prototype.resolveAll = function() {
                // Resolve all reflected objects
                var res;
                if (this.ptr == null || typeof this.ptr.type === 'object') return; // Done (already resolved)
                if (this.ptr instanceof Reflect.Namespace) {
                    // Build all children
                    var children = this.ptr.getChildren();
                    for (var i=0; i<children.length; i++) {
                        this.ptr = children[i];
                        this.resolveAll();
                    }
                } else if (this.ptr instanceof Reflect.Message.Field) {
                    if (!Lang.TYPE.test(this.ptr.type)) { // Resolve type...
                        if (!Lang.TYPEREF.test(this.ptr.type)) {
                            throw(new Error("Illegal type reference in "+this.ptr.toString(true)+": "+this.ptr.type));
                        }
                        res = this.ptr.parent.resolve(this.ptr.type, true);
                        if (!res) {
                            throw(new Error("Unresolvable type reference in "+this.ptr.toString(true)+": "+this.ptr.type));
                        }
                        this.ptr.resolvedType = res;
                        if (res instanceof Reflect.Enum) {
                            this.ptr.type = ProtoBuf.TYPES["enum"];
                        } else if (res instanceof Reflect.Message) {
                            this.ptr.type = ProtoBuf.TYPES["message"];
                        } else {
                            throw(new Error("Illegal type reference in "+this.ptr.toString(true)+": "+this.ptr.type));
                        }
                    } else {
                        this.ptr.type = ProtoBuf.TYPES[this.ptr.type];
                    }
                } else if (this.ptr instanceof ProtoBuf.Reflect.Enum.Value) {
                    // No need to build enum values (built in enum)
                } else if (this.ptr instanceof ProtoBuf.Reflect.Service.Method) {
                    if (this.ptr instanceof ProtoBuf.Reflect.Service.RPCMethod) {
                        res = this.ptr.parent.resolve(this.ptr.requestName);
                        if (!res || !(res instanceof ProtoBuf.Reflect.Message)) {
                            throw(new Error("Illegal request type reference in "+this.ptr.toString(true)+": "+this.ptr.requestName));
                        }
                        this.ptr.resolvedRequestType = res;
                        res = this.ptr.parent.resolve(this.ptr.responseName);
                        if (!res || !(res instanceof ProtoBuf.Reflect.Message)) {
                            throw(new Error("Illegal response type reference in "+this.ptr.toString(true)+": "+this.ptr.responseName));
                        }
                        this.ptr.resolvedResponseType = res;
                    } else {
                        // Should not happen as nothing else is implemented
                        throw(new Error("Illegal service method type in "+this.ptr.toString(true)));
                    }
                } else {
                    throw(new Error("Illegal object type in namespace: "+typeof(this.ptr)+":"+this.ptr));
                }
                this.reset();
            };
        
            /**
             * Builds the protocol. This will first try to resolve all definitions and, if this has been successful,
             * return the built package.
             * @param {string=} path Specifies what to return. If omitted, the entire namespace will be returned.
             * @return {ProtoBuf.Builder.Message|Object.<string,*>}
             * @throws {Error} If a type could not be resolved
             * @expose
             */
            Builder.prototype.build = function(path) {
                this.reset();
                if (!this.resolved) {
                    this.resolveAll();
                    this.resolved = true;
                    this.result = null; // Require re-build
                }
                if (this.result == null) { // (Re-)Build
                    this.result = this.ns.build();
                }
                if (!path) {
                    return this.result;
                } else {
                    var part = path.split(".");
                    var ptr = this.result; // Build namespace pointer (no hasChild etc.)
                    for (var i=0; i<part.length; i++) {
                        if (ptr[part[i]]) {
                            ptr = ptr[part[i]];
                        } else {
                            ptr = null;
                            break;
                        }
                    }
                    return ptr;
                }
            };
        
            /**
             * Similar to {@link ProtoBuf.Builder#build}, but looks up the internal reflection descriptor.
             * @param {string=} path Specifies what to return. If omitted, the entire namespace wiil be returned.
             * @return {ProtoBuf.Reflect.T} Reflection descriptor or `null` if not found
             */
            Builder.prototype.lookup = function(path) {
                return path ? this.ns.resolve(path) : this.ns;
            };
        
            /**
             * Returns a string representation of this object.
             * @return {string} String representation as of "Builder"
             * @expose
             */
            Builder.prototype.toString = function() {
                return "Builder";
            };
        
            // Pseudo types documented in Reflect.js.
            // Exist for the sole purpose of being able to "... instanceof ProtoBuf.Builder.Message" etc.
            Builder.Message = function() {};
            Builder.Service = function() {};
            
            return Builder;
            
        })(ProtoBuf, ProtoBuf.Lang, ProtoBuf.Reflect);
        

        /**
         * Utilities to parse ProtoBufs serialized to text format
         * @namespace
         * @expose
         */
        ProtoBuf.TextFormat = {};
        
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
                
        /**
         * Constructs a new Builder with the specified package defined.
         * @param {string=} pkg Package name as fully qualified name, e.g. "My.Game". If no package is specified, the
         * builder will only contain a global namespace.
         * @param {Object.<string,*>=} options Top level options
         * @return {ProtoBuf.Builder} New Builder
         * @expose
         */
        ProtoBuf.newBuilder = function(pkg, options) {
            var builder = new ProtoBuf.Builder();
            if (typeof pkg !== 'undefined' && pkg !== null) {
                builder.define(pkg, options);
            }
            return builder;
        };

        /**
         * Loads a .json definition and returns the Builder.
         * @param {!*|string} json JSON definition
         * @param {(ProtoBuf.Builder|string|{root: string, file: string})=} builder Builder to append to. Will create a new one if omitted.
         * @param {(string|{root: string, file: string})=} filename The corresponding file name if known. Must be specified for imports.
         * @return {ProtoBuf.Builder} Builder to create new messages
         * @throws {Error} If the definition cannot be parsed or built
         * @expose
         */
        ProtoBuf.loadJson = function(json, builder, filename) {
            if (typeof builder === 'string' || (builder && typeof builder["file"] === 'string' && typeof builder["root"] === 'string')) {
                filename = builder;
                builder = null;
            }
            if (!builder || typeof builder !== 'object') builder = ProtoBuf.newBuilder();
            if (typeof json === 'string') json = JSON.parse(json);
            builder["import"](json, filename);
            builder.resolveAll();
            builder.build();
            return builder;
        };

        /**
         * Loads a .json file and returns the Builder.
         * @param {string|{root: string, file: string}} filename Path to json file or an object specifying 'file' with
         *  an overridden 'root' path for all imported files.
         * @param {function(ProtoBuf.Builder)=} callback Callback that will receive the Builder as its first argument.
         *   If the request has failed, builder will be NULL. If omitted, the file will be read synchronously and this
         *   function will return the Builder or NULL if the request has failed.
         * @param {ProtoBuf.Builder=} builder Builder to append to. Will create a new one if omitted.
         * @return {?ProtoBuf.Builder|undefined} The Builder if synchronous (no callback specified, will be NULL if the
         *   request has failed), else undefined
         * @expose
         */
        ProtoBuf.loadJsonFile = function(filename, callback, builder) {
            if (callback && typeof callback === 'object') {
                builder = callback;
                callback = null;
            } else if (!callback || typeof callback !== 'function') {
                callback = null;
            }
            if (callback) {
                ProtoBuf.Util.fetch(typeof filename === 'object' ? filename["root"]+"/"+filename["file"] : filename, function(contents) {
                    try {
                        callback(ProtoBuf.loadJson(JSON.parse(contents), builder, filename));
                    } catch (err) {
                        callback(err);
                    }
                });
            } else {
                var contents = ProtoBuf.Util.fetch(typeof filename === 'object' ? filename["root"]+"/"+filename["file"] : filename);
                return contents !== null ? ProtoBuf.loadJson(JSON.parse(contents), builder, filename) : null;
            }
        };

        return ProtoBuf;
    }

    // Enable module loading if available
    if (typeof module != 'undefined' && module["exports"]) { // CommonJS
        module["exports"] = loadProtoBuf(require("bytebuffer"));
    } else if (typeof define != 'undefined' && define["amd"]) { // AMD
        define("ProtoBuf", ["ByteBuffer"], loadProtoBuf);
    } else { // Shim
        if (!global["dcodeIO"]) {
            global["dcodeIO"] = {};
        }
        global["dcodeIO"]["ProtoBuf"] = loadProtoBuf(global["dcodeIO"]["ByteBuffer"]);
    }

})(this);