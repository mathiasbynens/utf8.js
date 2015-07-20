module.exports = function(grunt) {

	grunt.initConfig({
		'shell': {
			'options': {
				'stdout': true,
				'stderr': true,
				'failOnError': true
			},
			'generate-test-data': { // Only when needed
				'command': 'if [ ! -f data.json ]; then python generate-test-data.py; fi',
				'options': {
					'execOptions': {
						'cwd': 'tests'
					}
				}
			},
			'cover-html': {
				'command': 'istanbul cover --report "html" --verbose --dir "coverage" "tests/tests.js"; istanbul report --root "coverage" --format "html"'
			},
			'cover-coveralls': {
				'command': 'istanbul cover --verbose --dir "coverage" "tests/tests.js" && coveralls < coverage/lcov.info|coveralls < coverage/lcov.info; rm -rf coverage/lcov*'
			},
			'test-narwhal': {
				'command': 'echo "Testing in Narwhal..."; export NARWHAL_OPTIMIZATION=-1; narwhal "tests/tests.js"'
			},
			'test-phantomjs': {
				'command': 'echo "Testing in PhantomJS..."; phantomjs "tests/tests.js"'
			},
			'test-rhino': {
				'command': 'echo "Testing in Rhino..."; rhino -opt -1 "tests.js"',
				'options': {
					'execOptions': {
						'cwd': 'tests'
					}
				}
			},
			'test-ringo': {
				'command': 'echo "Testing in Ringo..."; ringo -o -1 "tests/tests.js"'
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
		'shell:test-narwhal',
		'shell:test-phantomjs',
		'shell:test-rhino',
		'shell:test-ringo',
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
