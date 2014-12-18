/* global module:false */


/*
 * Usage:
 *
 * grunt devel:   Build the JsSIP Grammar.
 *
 * grunt dist:    Generate builds/jssip-X.Y.Z.js, builds/jssip-last.js
 *                symlink pointing to it, builds/jssip-X.Y.Z.min.js and
 *                builds/jssip.js which is a copy of the minified file.
 *
 * grunt test:    Run test units.
 *
 * grunt:         Alias for 'grunt dist'.
 */


module.exports = function(grunt) {
	// Banner.
	var banner = require('fs').readFileSync('src/banner.txt').toString();

	var path = require('path');

	// Generated builds.
	var builds = {
		dist: 'builds/<%= pkg.name %>-<%= pkg.version %>.js',
		copy: 'builds/<%= pkg.name %>.js',
		last: 'builds/<%= pkg.name %>-last.js',
	};

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jshint: {
			// Default options.
			options: {
				// DOC: http://www.jshint.com/docs/options/
				curly: true,
				eqeqeq: true,
				forin: true,
				immed: true,
				latedef: 'nofunc',  // Allow functions to be used before defined (it is valid).
				newcap: true,
				noarg: true,
				noempty: true,
				nonbsp:  true,
				// nonew: true,  // TODO: Enable when fixed.
				plusplus: false,
				quotmark: 'single',
				undef: true,
				unused: true,
				boss: false,
				eqnull: false,
				funcscope: false,
				sub: false,
				supernew: false,
				browser: true,
				devel: true,
				node: true,
				nonstandard: true,  // Allow 'unescape()' and 'escape()'.
				globals: {
					webkitRTCPeerConnection: false,
					mozRTCPeerConnection: false,
					RTCPeerConnection: false,
					webkitRTCSessionDescription: false,
					mozRTCSessionDescription: false,
					RTCSessionDescription: false
				}
			},
			// Lint JS files separately.
			each_file: {
				src: [ 'src/**/*.js' ],
				options: {
					ignores: [ 'src/Grammar.js' ]
				}
			}
		},

		nodeunit: {
			all: [ 'test/*.js' ],
			options: {
				reporter: 'default'
			}
		},

		browserify: {
			dist: {
				files: {
					'builds/<%= pkg.name %>-<%= pkg.version %>.js': [ 'src/JsSIP.js' ]
				},
				options: {
					browserifyOptions: {
						standalone: 'JsSIP'
					}
				}
			}
		},

		concat: {
			dist: {
				src: builds.dist,
				dest: builds.dist,
				options: {
					banner: banner,
					separator: '\n\n'
				},
				nonull: true
			}
		},

		symlink: {
			options: {
				overwrite: true
			},
			last: {
				src: builds.dist,
				dest: builds.last
			}
		},

		uglify: {
			dist: {
				files: {
					'builds/<%= pkg.name %>-<%= pkg.version %>.min.js': [ builds.dist ]
				}
			},
			options: {
				banner: banner
			}
		},

		copy: {
			minified: {
				src: 'builds/<%= pkg.name %>-<%= pkg.version %>.min.js',
				dest: builds.copy
			}
		},

		watch: {
			dist: {
				files: [ 'src/**/*.js' ],
				tasks: [ 'jshint:each_file', 'test' ],
				options: {
					nospawn: true
				}
			}
		}
	});


	// Load Grunt plugins.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-symlink');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');


	// Task for building src/Grammar.js.
	// NOTE: This task is not included in 'grunt dist'.
	grunt.registerTask('grammar', function() {
		var done = this.async();  // This is an async task.
		var sys = require('sys');
		var exec = require('child_process').exec;
		var child;

		// First compile JsSIP grammar with PEGjs.
		console.log('grammar task: compiling JsSIP PEGjs grammar into Grammar.js...');
		var local_pegjs = path.resolve('./node_modules/.bin/pegjs');
		var Grammar_pegjs = path.resolve('src/Grammar.pegjs');
		var Grammar_js = path.resolve('src/Grammar.js');
		child = exec('' +
				'if [ -x "' + local_pegjs + '" ] ; then\n' +
					'PEGJS_BIN="' + local_pegjs + '";\n' +
				'else\n' +
					'PEGJS_BIN="pegjs";\n' +
				'fi &&\n' +
				'$PEGJS_BIN ' + Grammar_pegjs + ' ' + Grammar_js,
			function(error, stdout, stderr) {
			if (error) {
				sys.print('ERROR: ' + stderr);
				done(false);  // Tell grunt that async task has failed.
			}
			console.log('OK');

			// Then modify the generated Grammar.js file with custom changes.
			console.log('grammar task: applying custom changes to Grammar.js...');
			var fs = require('fs');
			var grammar = fs.readFileSync('src/Grammar.js').toString();
			var modified_grammar = grammar.replace(/throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/, 'new this.SyntaxError($1);\n        return -1;$2}$3return data;');
			fs.writeFileSync('src/Grammar.js', modified_grammar);
			console.log('OK');
			done();  // Tell grunt that async task has succeeded.
		});
	});

	grunt.registerTask('devel', [ 'grammar' ]);

	// Test task (nodeunit).
	grunt.registerTask('test', [ 'nodeunit:all' ]);

	// Taks for building builds/jssip-X.Y.Z.js and builds/jssip-last.js symlink.
	// NOTE: This task assumes that 'grunt devel' has been already executed.
	grunt.registerTask('dist', [ 'jshint:each_file', 'test', 'browserify:dist', 'concat:dist', 'symlink:last', 'uglify:dist', 'copy:minified' ]);

	// Task for Travis CI.
	grunt.registerTask('travis', [ 'dist' ]);

	// Default task points to 'dist' task.
	grunt.registerTask('default', [ 'dist' ]);
};
