module.exports = function(grunt) {

	grunt.initConfig({
		'shell': {
			'options': {
				'stdout': true,
				'stderr': true,
				'failOnError': true
			},
			'cover-html': {
				'command': 'istanbul cover --report "html" --verbose --dir "coverage" "tests/tests.js"; istanbul report --root "coverage" --format "html"'
			},
			'cover-coveralls': {
				'command': 'istanbul cover --verbose --dir "coverage" "tests/tests.js" && coveralls < coverage/lcov.info; rm -rf coverage/lcov*'
			},
			'test-node': {
				'command': 'echo "Testing in Node..."; node "tests/tests.js"'
			},
			'test-node-extended': {
				'command': 'echo "Testing in Node..."; node "tests/tests.js" --extended'
			},
			'test-browser': {
				'command': 'echo "Testing in a browser..."; open "tests/index.html"'
			}
		}
	});

	grunt.loadNpmTasks('grunt-shell');

	grunt.registerTask('cover', 'shell:cover-html');
	grunt.registerTask('ci', [
		'shell:generate-test-data',
		'shell:test-node',
	]);
	grunt.registerTask('test', [
		'shell:generate-test-data',
		'ci',
		'shell:test-node-extended',
		'shell:test-browser'
	]);

	grunt.registerTask('default', [
		'shell:test-node-extended',
		'cover'
	]);

};
