'use strict';

// test with node.js on 50MB data encoding

var utf8 = require('../utf8.js');
console.log('started. mem: %d', mem());
var buffer = new Buffer(1024*1024*50);
var letters = ['a', 'ы', '6', 'ð'];
for (var i = 0; i < buffer.length; i++) {
	buffer[i] = letters[i % letters.length].charCodeAt(0);
}
var str = buffer.toString('utf8');
buffer = null;
console.log('created string. mem: %d', mem());
str = utf8.encode(str);
console.log('encoded string (%d chars). mem: %d', str.length, mem());
str = utf8.decode(str);
console.log('converted string (%d chars). mem: %d', str.length, mem());

function mem() {
	if (global.gc) global.gc();
	return Math.round(process.memoryUsage().rss/1024/1024);
}