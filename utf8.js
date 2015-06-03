/*! https://mths.be/utf8js v2.0.0 by @mathias */
;(function(root) {

    // Detect free variables `exports`
    var freeExports = typeof exports == 'object' && exports;

    // Detect free variable `module`
    var freeModule = typeof module == 'object' && module &&
        module.exports == freeExports && module;

    // Detect free variable `global`, from Node.js or Browserified code,
    // and use it as `root`
    var freeGlobal = typeof global == 'object' && global;
    if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
        root = freeGlobal;
    }

    'use strict';

    /**
     * UCS-2 decoder stream
     * @param {string} source - source string
     * @constructor
     */
    function Ucs2StreamDecoder(source) {
        this.source = source;
        this.len = source.length;
        this.pos = 0;
    }

    /**
     * Get next UCS2 char code
     * @return {number} positive value meaning char code; NaN, if there's no symbol
     */
    Ucs2StreamDecoder.prototype.next = function () {
        if (this.pos >= this.len) {
            return NaN;
        }
        var value = this.source.charCodeAt(this.pos++);
        if (value >= 0xD800 && value <= 0xDBFF) {
            // high surrogate, and there is a next character
            var extra = this.source.charCodeAt(this.pos++);
            if ((extra & 0xFC00) == 0xDC00) { // low surrogate
                value = ((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
            } else {
                // unmatched surrogate; only append this code unit, in case the next
                // code unit is the high surrogate of a surrogate pair
                this.pos--;
            }
        }
        return value;
    };

    function encodeCodePoint(codePoint) {
        if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
            return String.fromCharCode(codePoint);
        }
        var symbol = '';
        if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
            symbol = String.fromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
        }
        else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
            checkScalarValue(codePoint);
            symbol = String.fromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
            symbol += createByte(codePoint, 6);
        }
        else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
            symbol = String.fromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
            symbol += createByte(codePoint, 12);
            symbol += createByte(codePoint, 6);
        }
        symbol += String.fromCharCode((codePoint & 0x3F) | 0x80);
        return symbol;
    }

    function createByte(codePoint, shift) {
        return String.fromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
    }

    function checkScalarValue(codePoint) {
        if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
            throw Error(
                'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
                ' is not a scalar value'
            );
        }
    }

    function utf8encode(str) {
        var decoder = new Ucs2StreamDecoder(str),
            codePoint,
            arr = new Array(1000),
            arrIx = 0, arrLen = arr.length,
            result = '';
        while (true) {
            codePoint = decoder.next();
            if (isNaN(codePoint)) {
                break;
            }
            arr[arrIx++] = encodeCodePoint(codePoint);
            if (arrIx === arrLen) {
                result += arr.join('');
                arrIx = 0;
            }
        }
        if (arrIx > 0) {
            arr.length = arrIx;
            result += arr.join('');
        }
        return result;
    }

    /**
     * codePoint decoder stream
     * @param {Ucs2StreamDecoder} source - source stream
     * @constructor
     */
    function CodePointStreamDecoder(source) {
        this.source = source;
    }

    /**
     * Get next char
     * @return {number} positive value meaning char code; NaN, if there's no symbol
     */
    CodePointStreamDecoder.prototype.next = function () {
        var byte1, byte2, byte3, byte4;
        var codePoint;

        byte1 = this.source.next();
        if (isNaN(byte1)) {
            return NaN;
        }

        // Read first byte
        byte1 = byte1 & 0xFF;

        // 1-byte sequence (no continuation bytes)
        if ((byte1 & 0x80) == 0) {
            return byte1;
        }

        // 2-byte sequence
        if ((byte1 & 0xE0) == 0xC0) {
            var b = this.readContinuationByte();
            codePoint = ((byte1 & 0x1F) << 6) | b;
            if (codePoint >= 0x80) {
                return codePoint;
            } else {
                throw Error('Invalid continuation byte');
            }
        }

        // 3-byte sequence (may include unpaired surrogates)
        if ((byte1 & 0xF0) == 0xE0) {
            byte2 = this.readContinuationByte();
            byte3 = this.readContinuationByte();
            codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
            if (codePoint >= 0x0800) {
                checkScalarValue(codePoint);
                return codePoint;
            } else {
                throw Error('Invalid continuation byte');
            }
        }

        // 4-byte sequence
        if ((byte1 & 0xF8) == 0xF0) {
            byte2 = this.readContinuationByte();
            byte3 = this.readContinuationByte();
            byte4 = this.readContinuationByte();
            codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
            (byte3 << 0x06) | byte4;
            if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
                return codePoint;
            }
        }

        throw Error('Invalid UTF-8 detected');
    };

    CodePointStreamDecoder.prototype.readContinuationByte = function () {
        var ch = this.source.next();
        if (isNaN(ch)) {
            throw Error('EOF');
        }
        var continuationByte = ch & 0xFF;
        if ((continuationByte & 0xC0) == 0x80) {
            return continuationByte & 0x3F;
        }
        // If we end up here, it’s not a continuation byte
        throw Error('Invalid continuation byte');
    };

    function utf8decode(str) {
        var decoder = new CodePointStreamDecoder(new Ucs2StreamDecoder(str)),
            codePoint,
            arr = new Array(1000),
            arrIx = 0, arrLen = arr.length,
            result = '';
        while (true) {
            codePoint = decoder.next();
            if (isNaN(codePoint)) {
                break;
            }
            if (codePoint > 0xFFFF) {
                codePoint -= 0x10000;
                arr[arrIx++] = String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
                codePoint = 0xDC00 | codePoint & 0x3FF;
                if (arrIx === arrLen) {
                    result += arr.join('');
                    arrIx = 0;
                }
            }
            arr[arrIx++] = String.fromCharCode(codePoint);
            if (arrIx === arrLen) {
                result += arr.join('');
                arrIx = 0;
            }
        }
        if (arrIx > 0) {
            arr.length = arrIx;
            result += arr.join('');
        }
        return result;
    }
    var utf8 = {
        'version': '2.2.0',
        'encode': utf8encode,
        'decode': utf8decode
    };

    // Some AMD build optimizers, like r.js, check for specific condition patterns
    // like the following:
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        define(function() { return utf8; });
    } else if (freeExports && !freeExports.nodeType) {
        if (freeModule) { // in Node.js or RingoJS v0.8.0+
            freeModule.exports = utf8;
        } else { // in Narwhal or RingoJS v0.7.0-
            for (var key in utf8) {
                if (Object.prototype.hasOwnProperty.call(utf8, key)) {
                    freeExports[key] = utf8[key];
                }
            }
        }
    } else { // in Rhino or a web browser
        root.utf8 = utf8;
    }
}(this));
