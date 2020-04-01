/*! https://mths.be/utf8js v3.0.0 by @mathias */
;(function(root) {

	var stringFromCharCode = String.fromCharCode;

	// Taken from https://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from https://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	function checkScalarValue(codePoint) {
		if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
			throw Error(
				'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
				' is not a scalar value'
			);
		}
	}
	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return ((codePoint >> shift) & 0x3F) | 0x80;
	}

	function encodeCodePointToStrings(codePoint) {
		var symbol = encodeCodePoint(codePoint);
		for (var i = 0 ; i < symbol.length ; i++) {
			symbol[i] = stringFromCharCode(symbol[i]);
		}

		return symbol;
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return [codePoint];
		}
		var symbol = [];
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol.push(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			checkScalarValue(codePoint);
			symbol.push(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol.push(createByte(codePoint, 6));
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol.push(((codePoint >> 18) & 0x07) | 0xF0);
			symbol.push(createByte(codePoint, 12));
			symbol.push(createByte(codePoint, 6));
		}
		symbol.push((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8Encode(string, encodeCodePointFn) {
		var codePoints = ucs2decode(string);
		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteArray = [];
		while (++index < length) {
			codePoint = codePoints[index];
			byteArray = byteArray.concat(encodeCodePointFn(codePoint));
		}
		return byteArray;
	}

	function utf8EncodeToByteString(string) {
		if(typeof(string) !== 'string') {
			throw new Error('Invalid argument type. Expected string.');
		}
		var encoded = utf8Encode(string, encodeCodePointToStrings);
		var byteString = encoded.join('');
		return byteString;
	}

	function utf8EncodeToByteArray(string) {
		if(typeof(string) !== 'string') {
			throw new Error('Invalid argument type. Expected string.');
		}
		return utf8Encode(string, encodeCodePoint);
	}

	function utf8EncodeToUint8Array(string) {
		if(typeof(string) !== 'string') {
			throw new Error('Invalid argument type. Expected string.');
		}
		return Uint8Array.from(utf8EncodeToByteArray(string));
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
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
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8Decode() {
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	function utf8DecodeString(byteString) {
		if(typeof(byteString) !== 'string') {
			throw new Error('Invalid argument type. Expected string.');
		}
		byteArray = ucs2decode(byteString);
		return utf8DecodeArray(byteArray);
	}

	function utf8DecodeArray(bArray) {
		if(!Array.isArray(bArray) && !(bArray instanceof Uint8Array)) {
			throw new Error('Invalid argument type. Expected array or Uint8Array');
		}
		byteArray = bArray;
		return utf8Decode();
	}

	/*--------------------------------------------------------------------------*/

	root.version = '3.0.0';
	root.encode = utf8EncodeToByteString;
	root.encodeToArray = utf8EncodeToByteArray;
	root.encodeToUint8Array = utf8EncodeToUint8Array;
	root.decode = utf8DecodeString;
	root.decodeArray = utf8DecodeArray;

}(typeof exports === 'undefined' ? this.utf8 = {} : exports));
