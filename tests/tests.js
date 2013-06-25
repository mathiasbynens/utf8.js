;(function(root) {
	'use strict';

	/** Use a single `load` function */
	var load = typeof require == 'function' ? require : root.load;

	/** The unit testing framework */
	var QUnit = (function() {
		var noop = Function.prototype;
		return root.QUnit || (
			root.addEventListener || (root.addEventListener = noop),
			root.setTimeout || (root.setTimeout = noop),
			root.QUnit = load('../node_modules/qunitjs/qunit/qunit.js') || root.QUnit,
			(load('../node_modules/qunit-clib/qunit-clib.js') || { 'runInContext': noop }).runInContext(root),
			addEventListener === noop && delete root.addEventListener,
			root.QUnit
		);
	}());

	/** The `utf8` object to test */
	var utf8 = root.utf8 || (root.utf8 = (
		utf8 = load('../utf8.js') || root.utf8,
		utf8 = utf8.utf8 || utf8
	));

	/*--------------------------------------------------------------------------*/

	function forEach(array, fn) {
		var index = -1;
		var length = array.length;
		while (++index < length) {
			fn(array[index]);
		}
	}

	// Quick and dirty test to see if we’re in Node & need extended tests
	var runExtendedTests = (function() {
		try {
			return process.argv[0] == 'node' && process.argv[2] == '--extended';
		} catch(error) { }
	}());

	var data = [
		// 1-byte
		{
			'codePoint': 0x0000,
			'decoded': '\0',
			'encoded': '\0'
		},
		{
			'codePoint': 0x005C,
			'decoded': '\x5C',
			'encoded': '\x5C'
		},
		{
			'codePoint': 0x007F,
			'decoded': '\x7F',
			'encoded': '\x7F'
		},

		// 2-byte
		{
			'codePoint': 0x0080,
			'decoded': '\x80',
			'encoded': '\xC2\x80'
		},
		{
			'codePoint': 0x05CA,
			'decoded': '\u05CA',
			'encoded': '\xD7\x8A'
		},
		{
			'codePoint': 0x07FF,
			'decoded': '\u07FF',
			'encoded': '\xDF\xBF',
		},

		// 3-byte
		{
			'codePoint': 0x0800,
			'decoded': '\u0800',
			'encoded': '\xE0\xA0\x80',
		},
		{
			'codePoint': 0x2C3C,
			'decoded': '\u2C3C',
			'encoded': '\xE2\xB0\xBC'
		},
		{
			'codePoint': 0xFFFF,
			'decoded': '\uFFFF',
			'encoded': '\xEF\xBF\xBF'
		},
		// unmatched surrogate halves
		// high surrogates: 0xD800 to 0xDBFF
		{
			'codePoint': 0xD800,
			'decoded': '\uD800',
			'encoded': '\xED\xA0\x80'
		},
		{
			'description': 'High surrogate followed by another high surrogate',
			'decoded': '\uD800\uD800',
			'encoded': '\xED\xA0\x80\xED\xA0\x80'
		},
		{
			'description': 'High surrogate followed by a symbol that is not a surrogate',
			'decoded': '\uD800A',
			'encoded': '\xED\xA0\x80A'
		},
		{
			'description': 'Unmatched high surrogate, followed by a surrogate pair, followed by an unmatched high surrogate',
			'decoded': '\uD800\uD834\uDF06\uD800',
			'encoded': '\xED\xA0\x80\xF0\x9D\x8C\x86\xED\xA0\x80'
		},
		{
			'codePoint': 0xD9AF,
			'decoded': '\uD9AF',
			'encoded': '\xED\xA6\xAF'
		},
		{
			'codePoint': 0xDBFF,
			'decoded': '\uDBFF',
			'encoded': '\xED\xAF\xBF'
		},
		// low surrogates: 0xDC00 to 0xDFFF
		{
			'codePoint': 0xDC00,
			'decoded': '\uDC00',
			'encoded': '\xED\xB0\x80'
		},
		{
			'description': 'Low surrogate followed by another low surrogate',
			'decoded': '\uDC00\uDC00',
			'encoded': '\xED\xB0\x80\xED\xB0\x80'
		},
		{
			'description': 'Low surrogate followed by a symbol that is not a surrogate',
			'decoded': '\uDC00A',
			'encoded': '\xED\xB0\x80A'
		},
		{
			'description': 'Unmatched low surrogate, followed by a surrogate pair, followed by an unmatched low surrogate',
			'decoded': '\uDC00\uD834\uDF06\uDC00',
			'encoded': '\xED\xB0\x80\xF0\x9D\x8C\x86\xED\xB0\x80'
		},
		{
			'codePoint': 0xDEEE,
			'decoded': '\uDEEE',
			'encoded': '\xED\xBB\xAE'
		},
		{
			'codePoint': 0xDFFF,
			'decoded': '\uDFFF',
			'encoded': '\xED\xBF\xBF'
		},

		// 4-byte
		{
			'codePoint': 0x010000,
			'decoded': '\uD800\uDC00',
			'encoded': '\xF0\x90\x80\x80'
		},
		{
			'codePoint': 0x01D306,
			'decoded': '\uD834\uDF06',
			'encoded': '\xF0\x9D\x8C\x86'
		},
		{
			'codePoint': 0x10FFF,
			'decoded': '\uDBFF\uDFFF',
			'encoded': '\xF4\x8F\xBF\xBF'
		}
	];

	// Stress test data
	// http://www.cl.cam.ac.uk/~mgk25/ucs/examples/UTF-8-test.txt
	var decodeTestData = [
		{
			'description': 'The Greek word `kosme`',
			'decoded': '\u03BA\u1F79\u03C3\u03BC\u03B5',
			'encoded': '\xCE\xBA\xE1\xBD\xB9\xCF\x83\xCE\xBC\xCE\xB5'
		},
		{
			'description': 'The Greek word `kosme`',
			'decoded': '\u03BA\u1F79\u03C3\u03BC\u03B5',
			'encoded': '\xCE\xBA\xE1\xBD\xB9\xCF\x83\xCE\xBC\xCE\xB5'
		},
		{
			'description': '5-byte sequence (disallowed per RFC 3629)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF8\x88\x80\x80\x80'
		},
		{
			'description': 'Another 5-byte sequence (disallowed per RFC 3629)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFB\xBF\xBF\xBF\xBF'
		},
		{
			'description': '6-byte sequence (disallowed per RFC 3629)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFC\x84\x80\x80\x80\x80'
		},
		{
			'description': '6-byte sequence (disallowed per RFC 3629)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFD\xBF\xBF\xBF\xBF\xBF'
		},
		{
			'codePoint': 0xD7FF,
			'decoded': '\uD7FF',
			'encoded': '\xED\x9F\xBF'
		},
		{
			'codePoint': 0xE000,
			'decoded': '\uE000',
			'encoded': '\xEE\x80\x80'
		},
		{
			'codePoint': 0xFFFD,
			'decoded': '\uFFFD',
			'encoded': '\xEF\xBF\xBD'
		},
		{
			'description': 'U+110000 (invalid code point + disallowed in UTF-8 per RFC 3629)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF4\x90\x80\x80'
		},
		{
			'description': 'Unexpected continuation byte: 0x80',
			'decoded': '\uFFFD',
			'encoded': '\x80'
		},
		{
			'description': 'Unexpected continuation byte: 0xBF',
			'decoded': '\uFFFD',
			'encoded': '\xBF'
		},
		{
			'description': 'Unexpected continuation bytes: 0x80 0xBF',
			'decoded': '\uFFFD\uFFFD',
			'encoded': '\x80\xBF'
		},
		{
			'description': 'Unexpected continuation bytes: 0x80 0xBF 0x80',
			'decoded': '\uFFFD\uFFFD\uFFFD',
			'encoded': '\x80\xBF\x80'
		},
		{
			'description': 'Unexpected continuation bytes: 0x80 0xBF 0x80 0xBF',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\x80\xBF\x80\xBF'
		},
		{
			'description': 'Unexpected continuation bytes: 0x80 0xBF 0x80 0xBF 0x80',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\x80\xBF\x80\xBF\x80'
		},
		{
			'description': 'Unexpected continuation bytes: 0x80 0xBF 0x80 0xBF 0x80 0xBF',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\x80\xBF\x80\xBF\x80\xBF'
		},
		{
			'description': 'Unexpected continuation bytes: 0x80 0xBF 0x80 0xBF 0x80 0xBF 0x80',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\x80\xBF\x80\xBF\x80\xBF\x80'
		},
		{
			'description': 'Sequence of all 64 possible continuation bytes (0x80-0xBF)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F\xA0\xA1\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xAB\xAC\xAD\xAE\xAF\xB0\xB1\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xBB\xBC\xBD\xBE\xBF'
		},
		{
			'description': 'All 32 first bytes of 2-byte sequences (0xC0-0xDF), space-separated',
			'decoded': '\uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD',
			'encoded': '\xC0 \xC1 \xC2 \xC3 \xC4 \xC5 \xC6 \xC7 \xC8 \xC9 \xCA \xCB \xCC \xCD \xCE \xCF \xD0 \xD1 \xD2 \xD3 \xD4 \xD5 \xD6 \xD7 \xD8 \xD9 \xDA \xDB \xDC \xDD \xDE \xDF'
		},
		{
			'description': 'All 16 first bytes of 3-byte sequences (0xE0-0xEF), space-separated',
			'decoded': '\uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD',
			'encoded': '\xE0 \xE1 \xE2 \xE3 \xE4 \xE5 \xE6 \xE7 \xE8 \xE9 \xEA \xEB \xEC \xED \xEE \xEF'
		},
		{
			'description': 'All 8 first bytes of 4-byte sequences (0xF0-0xF7), separated',
			'decoded': '\uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD \uFFFD',
			'encoded': '\xF0 \xF1 \xF2 \xF3 \xF4 \xF5 \xF6 \xF7'
		},
		{
			'description': 'All 4 first bytes of 5-byte sequences (0xF8-0xFB), space-separated',
			'decoded': '\uFFFD \uFFFD \uFFFD \uFFFD',
			'encoded': '\xF8 \xF9 \xFA \xFB'
		},
		{
			'description': 'All 2 first bytes of 6-byte sequences (0xFC-0xFD), space-separated',
			'decoded': '\uFFFD \uFFFD',
			'encoded': '\xFC \xFD'
		},
		{
			'description': '2-byte sequence with last byte missing (U+0000)',
			'decoded': '\uFFFD',
			'encoded': '\xC0'
		},
		{
			'description': '3-byte sequence with last byte missing (U+0000)',
			'decoded': '\uFFFD\uFFFD',
			'encoded': '\xE0\x80'
		},
		{
			'description': '4-byte sequence with last byte missing (U+0000)',
			'decoded': '',
			'encoded': '\xF0\x80\x80'
		},
		{
			'description': '5-byte sequence with last byte missing (U+0000)',
			'decoded': '',
			'encoded': '\xF8\x80\x80\x80'
		},
		{
			'description': '6-byte sequence with last byte missing (U+0000)',
			'decoded': '',
			'encoded': '\xF8\x80\x80\x80\x80'
		},
		{
			'description': '2-byte sequence with last byte missing (U-000007FF)',
			'decoded': '\uFFFD',
			'encoded': '\xDF'
		},
		{
			'description': '3-byte sequence with last byte missing (U-0000FFFF)',
			'decoded': '\uFFFD\uFFFD',
			'encoded': '\xEF\xBF'
		},
		{
			'description': '4-byte sequence with last byte missing (U-0000FFFF)',
			'decoded': '\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF7\xBF\xBF'
		},
		{
			'description': '5-byte sequence with last byte missing (U-0000FFFF)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFB\xBF\xBF\xBF'
		},
		{
			'description': '6-byte sequence with last byte missing (U-0000FFFF)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFD\xBF\xBF\xBF\xBF'
		},
		{
			'description': 'All the previous bytes combined',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xC0\xE0\x80\xF0\x80\x80\xF8\x80\x80\x80\xFC\x80\x80\x80\x80\xDF\xEF\xBF\xF7\xBF\xBF\xFB\xBF\xBF\xBF\xFD\xBF\xBF\xBF\xBF'
		},
		{
			'description': 'Impossible byte 0xFE (cannot appear in a correct UTF-8 string)',
			'decoded': '\uFFFD',
			'encoded': '\xFE'
		},
		{
			'description': 'Impossible byte 0xFF (cannot appear in a correct UTF-8 string)',
			'decoded': '\uFFFD',
			'encoded': '\xFF'
		},
		{
			'description': 'Impossible bytes 0xFE 0xFE 0xFF 0xFF (cannot appear in a correct UTF-8 string)',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFE\xFE\xFF\xFF'
		},
		{
			'description': 'Overlong representation of the slash symbol using two bytes',
			'decoded': '\uFFFD\uFFFD',
			'encoded': '\xC0\xAF'
		},
		{
			'description': 'Overlong representation of the slash symbol using three bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD',
			'encoded': '\xE0\x80\xAF'
		},
		{
			'description': 'Overlong representation of the slash symbol using four bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF0\x80\x80\xAF'
		},
		{
			'description': 'Overlong representation of the slash symbol using five bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF8\x80\x80\x80\xAF'
		},
		{
			'description': 'Overlong representation of the slash symbol using six bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFC\x80\x80\x80\x80\xAF'
		},
		{
			'description': 'Overlong representation of U+007F',
			'decoded': '\uFFFD\uFFFD',
			'encoded': '\xC1\xBF'
		},
		{
			'description': 'Overlong representation of U+07FF',
			'decoded': '\uFFFD\uFFFD\uFFFD',
			'encoded': '\xE0\x9F\xBF'
		},
		{
			'description': 'Overlong representation of U+FFFF',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF0\x8F\xBF\xBF'
		},
		{
			'description': 'Overlong representation of U+1FFFFF',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF8\x87\xBF\xBF\xBF'
		},
		{
			'description': 'Overlong representation of U+3FFFFFF',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFC\x83\xBF\xBF\xBF\xBF'
		},
		{
			'description': 'Overlong representation of U+0000 using two bytes',
			'decoded': '\uFFFD\uFFFD',
			'encoded': '\xC0\x80'
		},
		{
			'description': 'Overlong representation of U+0000 using three bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD',
			'encoded': '\xE0\x80\x80'
		},
		{
			'description': 'Overlong representation of U+0000 using four bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF0\x80\x80\x80'
		},
		{
			'description': 'Overlong representation of U+0000 using five bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xF8\x80\x80\x80\x80'
		},
		{
			'description': 'Overlong representation of U+0000 using six bytes',
			'decoded': '\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD\uFFFD',
			'encoded': '\xFC\x80\x80\x80\x80\x80'
		},
		// 5.2 Paired UTF-16 surrogates
		// We support these explicitly. (Should we not?)
		{
			'description': 'U+D800 U+DC00',
			'decoded': '\uD800\uDC00',
			'encoded': '\xED\xA0\x80\xED\xB0\x80'
		},
		{
			'description': 'U+D800 U+DFFF',
			'decoded': '\uD800\uDFFF',
			'encoded': '\xED\xA0\x80\xED\xBF\xBF'
		},
		{
			'description': 'U+DB7F U+DC00',
			'decoded': '\uDB7F\uDC00',
			'encoded': '\xED\xAD\xBF\xED\xB0\x80'
		},
		{
			'description': 'U+DB7F U+DFFF',
			'decoded': '\uDB7F\uDFFF',
			'encoded': '\xED\xAD\xBF\xED\xBF\xBF'
		},
		{
			'description': 'U+DB80 U+DC00',
			'decoded': '\uDB80\uDC00',
			'encoded': '\xED\xAE\x80\xED\xB0\x80'
		},
		{
			'description': 'U+DBFF U+DC00',
			'decoded': '\uDBFF\uDC00',
			'encoded': '\xED\xAE\x80\xED\xBF\xBF'
		},
		{
			'description': 'U+DBFF U+DFFF',
			'decoded': '\uDBBF\uDFFF',
			'encoded': '\xED\xAF\xBF\xED\xBF\xBF'
		},
		{
			'description': 'U+FFFE (illegal code point)',
			'decoded': '\uFFFE',
			'encoded': '\xEF\xBF\xBE'
		},
		{
			'description': 'U+FFFF (illegal code point)',
			'decoded': '\uFFFF',
			'encoded': '\xEF\xBF\xBF'
		}
	];

	// Test data from around the Web
	// We’ll just test if `utf8decode(utf8encode(str)) == str` for these.
	var otherData = [
		{
			'description': 'http://www.cl.cam.ac.uk/~mgk25/ucs/examples/quickbrown.txt',
			'decoded': 'Sentences that contain all letters commonly used in a language\n--------------------------------------------------------------\n\nMarkus Kuhn <http://www.cl.cam.ac.uk/~mgk25/> -- 2012-04-11\n\nThis is an example of a plain-text file encoded in UTF-8.\n\n\nDanish (da)\n---------\n\n  Quizdeltagerne spiste jordb\xE6r med fl\xF8de, mens cirkusklovnen\n  Wolther spillede p\xE5 xylofon.\n  (= Quiz contestants were eating strawbery with cream while Wolther\n  the circus clown played on xylophone.)\n\nGerman (de)\n-----------\n\n  Falsches \xDCben von Xylophonmusik qu\xE4lt jeden gr\xF6\xDFeren Zwerg\n  (= Wrongful practicing of xylophone music tortures every larger dwarf)\n\n  Zw\xF6lf Boxk\xE4mpfer jagten Eva quer \xFCber den Sylter Deich\n  (= Twelve boxing fighters hunted Eva across the dike of Sylt)\n\n  Heiz\xF6lr\xFCcksto\xDFabd\xE4mpfung\n  (= fuel oil recoil absorber)\n  (jqvwxy missing, but all non-ASCII letters in one word)\n\nGreek (el)\n----------\n\n  \u0393\u03B1\u03B6\u03AD\u03B5\u03C2 \u03BA\u03B1\u1F76 \u03BC\u03C5\u03C1\u03C4\u03B9\u1F72\u03C2 \u03B4\u1F72\u03BD \u03B8\u1F70 \u03B2\u03C1\u1FF6 \u03C0\u03B9\u1F70 \u03C3\u03C4\u1F78 \u03C7\u03C1\u03C5\u03C3\u03B1\u03C6\u1F76 \u03BE\u03AD\u03C6\u03C9\u03C4\u03BF\n  (= No more shall I see acacias or myrtles in the golden clearing)\n\n  \u039E\u03B5\u03C3\u03BA\u03B5\u03C0\u03AC\u03B6\u03C9 \u03C4\u1F74\u03BD \u03C8\u03C5\u03C7\u03BF\u03C6\u03B8\u03CC\u03C1\u03B1 \u03B2\u03B4\u03B5\u03BB\u03C5\u03B3\u03BC\u03AF\u03B1\n  (= I uncover the soul-destroying abhorrence)\n\nEnglish (en)\n------------\n\n  The quick brown fox jumps over the lazy dog\n\nSpanish (es)\n------------\n\n  El ping\xFCino Wenceslao hizo kil\xF3metros bajo exhaustiva lluvia y \n  fr\xEDo, a\xF1oraba a su querido cachorro.\n  (Contains every letter and every accent, but not every combination\n  of vowel + acute.)\n\nFrench (fr)\n-----------\n\n  Portez ce vieux whisky au juge blond qui fume sur son \xEEle int\xE9rieure, \xE0\n  c\xF4t\xE9 de l\'alc\xF4ve ovo\xEFde, o\xF9 les b\xFBches se consument dans l\'\xE2tre, ce\n  qui lui permet de penser \xE0 la c\xE6nogen\xE8se de l\'\xEAtre dont il est question\n  dans la cause ambigu\xEB entendue \xE0 Mo\xFF, dans un capharna\xFCm qui,\n  pense-t-il, diminue \xE7\xE0 et l\xE0 la qualit\xE9 de son \u0153uvre. \n\n  l\'\xEEle exigu\xEB\n  O\xF9 l\'ob\xE8se jury m\xFBr\n  F\xEAte l\'ha\xEF volap\xFCk,\n  \xC2ne ex a\xE9quo au whist,\n  \xD4tez ce v\u0153u d\xE9\xE7u.\n\n  Le c\u0153ur d\xE9\xE7u mais l\'\xE2me plut\xF4t na\xEFve, Lou\xFFs r\xEAva de crapa\xFCter en\n  cano\xEB au del\xE0 des \xEEles, pr\xE8s du m\xE4lstr\xF6m o\xF9 br\xFBlent les nov\xE6.\n\nIrish Gaelic (ga)\n-----------------\n\n  D\'fhuascail \xCDosa, \xDArmhac na h\xD3ighe Beannaithe, p\xF3r \xC9ava agus \xC1dhaimh\n\nHungarian (hu)\n--------------\n\n  \xC1rv\xEDzt\u0171r\u0151 t\xFCk\xF6rf\xFAr\xF3g\xE9p\n  (= flood-proof mirror-drilling machine, only all non-ASCII letters)\n\nIcelandic (is)\n--------------\n\n  K\xE6mi n\xFD \xF6xi h\xE9r ykist \xFEj\xF3fum n\xFA b\xE6\xF0i v\xEDl og \xE1drepa\n\n  S\xE6v\xF6r gr\xE9t \xE1\xF0an \xFEv\xED \xFAlpan var \xF3n\xFDt\n  (some ASCII letters missing)\n\nJapanese (jp)\n-------------\n\n  Hiragana: (Iroha)\n\n  \u3044\u308D\u306F\u306B\u307B\u3078\u3068\u3061\u308A\u306C\u308B\u3092\n  \u308F\u304B\u3088\u305F\u308C\u305D\u3064\u306D\u306A\u3089\u3080\n  \u3046\u3090\u306E\u304A\u304F\u3084\u307E\u3051\u3075\u3053\u3048\u3066\n  \u3042\u3055\u304D\u3086\u3081\u307F\u3057\u3091\u3072\u3082\u305B\u3059\n\n  Katakana:\n\n  \u30A4\u30ED\u30CF\u30CB\u30DB\u30D8\u30C8 \u30C1\u30EA\u30CC\u30EB\u30F2 \u30EF\u30AB\u30E8\u30BF\u30EC\u30BD \u30C4\u30CD\u30CA\u30E9\u30E0\n  \u30A6\u30F0\u30CE\u30AA\u30AF\u30E4\u30DE \u30B1\u30D5\u30B3\u30A8\u30C6 \u30A2\u30B5\u30AD\u30E6\u30E1\u30DF\u30B7 \u30F1\u30D2\u30E2\u30BB\u30B9\u30F3\n\nHebrew (iw)\n-----------\n\n  ? \u05D3\u05D2 \u05E1\u05E7\u05E8\u05DF \u05E9\u05D8 \u05D1\u05D9\u05DD \u05DE\u05D0\u05D5\u05DB\u05D6\u05D1 \u05D5\u05DC\u05E4\u05EA\u05E2 \u05DE\u05E6\u05D0 \u05DC\u05D5 \u05D7\u05D1\u05E8\u05D4 \u05D0\u05D9\u05DA \u05D4\u05E7\u05DC\u05D9\u05D8\u05D4\n\nPolish (pl)\n-----------\n\n  Pchn\u0105\u0107 w t\u0119 \u0142\xF3d\u017A je\u017Ca lub o\u015Bm skrzy\u0144 fig\n  (= To push a hedgehog or eight bins of figs in this boat)\n\nRussian (ru)\n------------\n\n  \u0412 \u0447\u0430\u0449\u0430\u0445 \u044E\u0433\u0430 \u0436\u0438\u043B \u0431\u044B \u0446\u0438\u0442\u0440\u0443\u0441? \u0414\u0430, \u043D\u043E \u0444\u0430\u043B\u044C\u0448\u0438\u0432\u044B\u0439 \u044D\u043A\u0437\u0435\u043C\u043F\u043B\u044F\u0440!\n  (= Would a citrus live in the bushes of south? Yes, but only a fake one!)\n\n  \u0421\u044A\u0435\u0448\u044C \u0436\u0435 \u0435\u0449\u0451 \u044D\u0442\u0438\u0445 \u043C\u044F\u0433\u043A\u0438\u0445 \u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0445 \u0431\u0443\u043B\u043E\u043A \u0434\u0430 \u0432\u044B\u043F\u0435\u0439 \u0447\u0430\u044E\n  (= Eat some more of these fresh French loafs and have some tea) \n\nThai (th)\n---------\n\n  [--------------------------|------------------------]\n  \u0E4F \u0E40\u0E1B\u0E47\u0E19\u0E21\u0E19\u0E38\u0E29\u0E22\u0E4C\u0E2A\u0E38\u0E14\u0E1B\u0E23\u0E30\u0E40\u0E2A\u0E23\u0E34\u0E10\u0E40\u0E25\u0E34\u0E28\u0E04\u0E38\u0E13\u0E04\u0E48\u0E32  \u0E01\u0E27\u0E48\u0E32\u0E1A\u0E23\u0E23\u0E14\u0E32\u0E1D\u0E39\u0E07\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E40\u0E14\u0E23\u0E31\u0E08\u0E09\u0E32\u0E19\n  \u0E08\u0E07\u0E1D\u0E48\u0E32\u0E1F\u0E31\u0E19\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23           \u0E2D\u0E22\u0E48\u0E32\u0E25\u0E49\u0E32\u0E07\u0E1C\u0E25\u0E32\u0E0D\u0E24\u0E45\u0E40\u0E02\u0E48\u0E19\u0E06\u0E48\u0E32\u0E1A\u0E35\u0E11\u0E32\u0E43\u0E04\u0E23\n  \u0E44\u0E21\u0E48\u0E16\u0E37\u0E2D\u0E42\u0E17\u0E29\u0E42\u0E01\u0E23\u0E18\u0E41\u0E0A\u0E48\u0E07\u0E0B\u0E31\u0E14\u0E2E\u0E36\u0E14\u0E2E\u0E31\u0E14\u0E14\u0E48\u0E32     \u0E2B\u0E31\u0E14\u0E2D\u0E20\u0E31\u0E22\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E01\u0E35\u0E2C\u0E32\u0E2D\u0E31\u0E0A\u0E0C\u0E32\u0E2A\u0E31\u0E22\n  \u0E1B\u0E0F\u0E34\u0E1A\u0E31\u0E15\u0E34\u0E1B\u0E23\u0E30\u0E1E\u0E24\u0E15\u0E34\u0E01\u0E0E\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E08        \u0E1E\u0E39\u0E14\u0E08\u0E32\u0E43\u0E2B\u0E49\u0E08\u0E4A\u0E30\u0E46 \u0E08\u0E4B\u0E32\u0E46 \u0E19\u0E48\u0E32\u0E1F\u0E31\u0E07\u0E40\u0E2D\u0E22 \u0E2F\n\n  [The copyright for the Thai example is owned by The Computer\n  Association of Thailand under the Royal Patronage of His Majesty the\n  King.]\n\nTurkish (tr)\n------------\n\n  Pijamal\u0131 hasta, ya\u011F\u0131z \u015Fof\xF6re \xE7abucak g\xFCvendi.\n  (=Patient with pajamas, trusted swarthy driver quickly)\n\n\nSpecial thanks to the people from all over the world who contributed\nthese sentences since 1999.\n\nA much larger collection of such pangrams is now available at\n\n  http://en.wikipedia.org/wiki/List_of_pangrams\n'
		}
	];

	if (runExtendedTests) {
		data = data.concat(require('./data.json'));
	}

	// `throws` is a reserved word in ES3; alias it to avoid errors
	var raises = QUnit.assert['throws'];

	// explicitly call `QUnit.module()` instead of `module()`
	// in case we are in a CLI environment
	QUnit.module('utf8.js');

	test('encode/decode', function() {
		forEach(data, function(object) {
			var description = object.description || 'U+' + object.codePoint.toString(16).toUpperCase();
			;
			equal(
				utf8.encode(object.decoded),
				object.encoded,
				'Encoding: ' + description
			);
			equal(
				utf8.decode(object.encoded),
				object.decoded,
				'Decoding: ' + description
			);
		});

		forEach(otherData, function(object) {
			equal(
				utf8.decode(utf8.encode(object.decoded)),
				object.decoded,
				'Encoding, then decoding ' + object.description
			);
		});

		forEach(decodeTestData, function(object) {
			equal(
				utf8.decode(object.encoded),
				object.decoded,
				'Decoding: ' + object.description
			)
		});

		// Error handling
		raises(
			function() {
				utf8.decode('\uFFFF', { 'strict': true });
			},
			Error,
			'Error: invalid UTF-8 detected'
		);
		raises(
			function() {
				utf8.decode('\x78\x9A\xBC\xDE\xF0', { 'strict': true });
			},
			Error,
			'Error: invalid UTF-8 detected'
		);
		raises(
			function() {
				utf8.decode('\xE9\x00\x00', { 'strict': true });
			},
			Error,
			'Error: invalid continuation byte (4-byte sequence expected)'
		);
		raises(
			function() {
				utf8.decode('\xC2\uFFFF', { 'strict': true });
			},
			Error,
			'Error: invalid continuation byte'
		);
		raises(
			function() {
				utf8.decode('\xF0\x9D', { 'strict': true });
			},
			Error,
			'Error: invalid byte index'
		);

	});

	/*--------------------------------------------------------------------------*/

	// configure QUnit and call `QUnit.start()` for
	// Narwhal, Node.js, PhantomJS, Rhino, and RingoJS
	if (!root.document || root.phantom) {
		QUnit.config.noglobals = true;
		QUnit.start();
	}
}(typeof global == 'object' && global || this));
