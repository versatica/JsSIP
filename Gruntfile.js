/* global module:false */


/*
 * Usage:
 *
 * grunt devel:   Build the JsSIP Grammar and SDP components.
 *
 * grunt dist:    Generate builds/jssip-X.Y.Z.js and a builds/jssip-last.js
 *                symlink pointing to it.
 *
 * grunt min:     Generate builds/jssip-X.Y.Z.min.js.
 *
 * grunt watch:   Watch for changes in the src/ directory and run 'grunt dist'.
 *
 * grunt:         Alias for 'grunt dist'.
 */


module.exports = function(grunt) {
	// JavaScript files defining the JsSIP namespace.
	var jsFiles = [
		'src/JsSIP.js',
		'src/Logger.js',
		'src/LoggerFactory.js',
		'src/EventEmitter.js',
		'src/Constants.js',
		'src/Exceptions.js',
		'src/Timers.js',
		'src/Transport.js',
		'src/Parser.js',
		'src/SIPMessage.js',
		'src/URI.js',
		'src/NameAddrHeader.js',
		'src/Transactions.js',
		'src/Dialog.js',
		'src/Dialog/RequestSender.js',
		'src/RequestSender.js',
		'src/Registrator.js',
		'src/RTCSession.js',
		'src/RTCSession/RTCMediaHandler.js',
		'src/RTCSession/Request.js',
		'src/RTCSession/DTMF.js',
		'src/Message.js',
		'src/UA.js',
		'src/Utils.js',
		'src/SanityCheck.js',
		'src/DigestAuthentication.js',
		'src/WebRTC.js'
	];

	// JavaScript files to concatenate.
	var concatFiles = (function() {
		var files = [];

		files.push('src/_head.js');
		files = files.concat(jsFiles);
		files.push('src/_tail.js');

		return files;
	}());

	// Files for documentation.
	var docFiles = [
		'README.md'
	].concat(jsFiles);

	// Banner.
	var banner = require('fs').readFileSync('src/banner.txt').toString();

	// Generated builds.
	var builds = {
		dist: 'builds/<%= pkg.name %>-<%= pkg.version %>.js',
		last: 'builds/<%= pkg.name %>-last.js',
	};


	// Project configuration.
	grunt.initConfig({

		pkg: grunt.file.readJSON('package.json'),

		meta: {
			banner: banner
		},

		concat: {
			dist: {
				src: concatFiles,
				dest: builds.dist,
				options: {
					banner: '<%= meta.banner %>',
					separator: '\n\n',
					process: true
				},
				nonull: true
			},
			post_dist: {
				src: [
					builds.dist,
					'src/Grammar/dist/Grammar.js',
					'src/SDP/dist/SDP.js'
				],
				dest: builds.dist,
				options: {
					separator: '\n\n',
					process: true
				},
				nonull: true
			},
		},

		jshint: {
			dist: builds.dist,
			// Default options.
			options: {
				// DOC: http://www.jshint.com/docs/options/
				curly: true,
				eqeqeq: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				noempty: true,
				nonbsp:  true,
				// nonew: true,  // TODO: Enable when fixed.
				plusplus: false,
				undef: true,
				unused: true,
				boss: false,
				eqnull: true,
				funcscope: false,
				sub: false,
				supernew: false,
				browser: true,
				devel: true,
				jquery: true,
				worker: true,
				globals: {
					module: false,  // false means that 'module' is defined elsewhere and cannot override it.
					define: false
				}
			},
			// Lint JS files separately.
			each_file: {
				src: jsFiles,
				options: {
					unused: false,
					ignores: [],
					globals: {
						// target: false,  // TODO: Add it when 'target' is given instead of 'window'.
						JsSIP: true  // true means that 'JsSIP' is defined here.
					}
				}
			}
		},

		uglify: {
			dist: {
				files: {
					'builds/<%= pkg.name %>-<%= pkg.version %>.min.js': [ builds.dist ]
				}
			},
			options: {
				banner: '<%= meta.banner %>'
			}
		},

		browserify: {
			sdp: {
				files: {
					'src/SDP/dist/SDP.js': [ 'src/SDP/main.js' ]
				}
			}
		},

		qunit: {
			noWebRTC: [ 'test/run-TestNoWebRTC.html' ]
		},

		watch: {
			dist: {
				files: jsFiles,
				tasks: [ 'dist' ],
				options: {
					nospawn: true
				}
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

		jsdoc : {
			basic: {
				src: docFiles,
				options: {
					destination: 'doc/basic/',
					private: false
				}
			},
			docstrap: {
				src: docFiles,
				options: {
					destination: 'doc/docstrap/',
					private: false,
					template: 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
					configure: 'jsdoc.conf.json'
				}
			}
		}
	});


	// Load Grunt plugins.
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-symlink');
	grunt.loadNpmTasks('grunt-jsdoc');


	// Task for building src/Grammar/dist/Grammar.js.
	// NOTE: This task is not included in 'grunt dist'.
	grunt.registerTask('grammar', function() {
		var done = this.async();  // This is an async task.
		var sys = require('sys');
		var exec = require('child_process').exec;
		var child;

		// First compile JsSIP grammar with PEGjs.
		console.log('grammar task: compiling JsSIP PEGjs grammar into Grammar.js...');
		child = exec('' +
				'if [ -x "./node_modules/pegjs/bin/pegjs" ] ; then\n' +
					'PEGJS_BIN="./node_modules/.bin/pegjs";\n' +
				'else\n' +
					'PEGJS_BIN="pegjs";\n' +
				'fi &&\n' +
				'mkdir -p src/Grammar/dist\n' +
				'$PEGJS_BIN -e JsSIP.Grammar src/Grammar/src/Grammar.pegjs src/Grammar/dist/Grammar.js',
			function(error, stdout, stderr) {
			if (error) {
				sys.print('ERROR: ' + stderr);
				done(false);  // Tell grunt that async task has failed.
			}
			console.log('OK');

			// Then modify the generated Grammar.js file with custom changes.
			console.log('grammar task: applying custom changes to Grammar.js...');
			var fs = require('fs');
			var grammar = fs.readFileSync('src/Grammar/dist/Grammar.js').toString();
			var modified_grammar = grammar.replace(/throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/, 'new this.SyntaxError($1);\n        return -1;$2}$3return data;');
			fs.writeFileSync('src/Grammar/dist/Grammar.js', modified_grammar);
			console.log('OK');
			done();  // Tell grunt that async task has succeeded.
		});
	});

	// Generate src/SDP/dist/SDP.js.
	// NOTE: This task is not included in 'grunt dist'.
	grunt.registerTask('sdp', [ 'browserify:sdp' ]);

	// Build both JsSIP Grammar and SDP components.
	grunt.registerTask('devel', [ 'grammar', 'sdp' ]);

	// Taks for building builds/jssip-X.Y.Z.js and builds/jssip-last.js symlink.
	// NOTE: This task assumes that 'devel' task has been already executed.
	grunt.registerTask('dist', [
		'jshint:each_file',
		'concat:dist',
		'jshint:dist',
		'concat:post_dist',
		'symlink:last'
	]);

	// Taks for building builds/jssip-X.Y.Z.min.js (minified).
	// NOTE: This task assumes that 'devel' and 'dist' tasks have been already executed.
	grunt.registerTask('min', [ 'uglify:dist']);

	// Test tasks.
	// NOTE: This task assumes that 'devel' and 'dist' tasks have been already executed.
	grunt.registerTask('testNoWebRTC', [ 'qunit:noWebRTC' ]);
	grunt.registerTask('test', [ 'testNoWebRTC' ]);

	// Build builds nice documentation using JsDoc3.
	grunt.registerTask('doc', [ 'jsdoc:docstrap' ]);

	// Task for Travis CI.
	grunt.registerTask('travis', [ 'test' ]);

	// Default task points to 'dist' task.
	grunt.registerTask('default', [ 'dist' ]);
};
