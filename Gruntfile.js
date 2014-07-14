/*global module:false*/

module.exports = function(grunt) {

  var srcFiles = [
    'src/JsSIP.js',
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
    'src/Dialogs.js',
    'src/RequestSender.js',
    'src/Registrator.js',
    'src/RTCSession.js',
    'src/Message.js',
    'src/UA.js',
    'src/Utils.js',
    'src/SanityCheck.js',
    'src/DigestAuthentication.js',
    'src/WebRTC.js',
    'src/tail.js',
  ];

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '\
/*\n\
 * JsSIP version <%= pkg.version %>\n\
 * Copyright (c) 2012-<%= grunt.template.today("yyyy") %> José Luis Millán - Versatica <http://www.versatica.com>\n\
 * Homepage: http://jssip.net\n\
 * License: http://jssip.net/license\n\
 */\n\n\n'
    },
    concat: {
      dist: {
        src: srcFiles,
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        options: {
          banner: '<%= meta.banner %>',
          separator: '\n\n',
          process: true
        },
        nonull: true
      },
      post_dist: {
        src: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.js',
          'src/Grammar/dist/Grammar.js',
          'src/SDP/dist/SDP.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        nonull: true
      },
      devel: {
        src: srcFiles,
        dest: 'dist/<%= pkg.name %>-devel.js',
        options: {
          banner: '<%= meta.banner %>',
          separator: '\n\n',
          process: true
        },
        nonull: true
      },
      post_devel: {
        src: [
          'dist/<%= pkg.name %>-devel.js',
          'src/Grammar/dist/Grammar.js',
          'src/SDP/dist/SDP.js'
        ],
        dest: 'dist/<%= pkg.name %>-devel.js',
        nonull: true
      }
    },
    includereplace: {
      dist: {
        files: {
          'dist': 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
        }
      },
      devel: {
        files: {
          'dist': 'dist/<%= pkg.name %>-devel.js'
        }
      }
    },
    jshint: {
      dist: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
      devel: 'dist/<%= pkg.name %>-devel.js',
      options: {
        browser: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: false,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        onecase:true,
        unused: true,
        supernew: true,
        globals: {
          module: true,
          define: true
        }
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
        }
      },
      options: {
        banner: '<%= meta.banner %>'
      }
    },
    qunit: {
      noWebRTC: ['test/run-TestNoWebRTC.html']
    },
    browserify: {
      dist: {
        files: {
          'src/SDP/dist/SDP.js': ['src/SDP/main.js']
        }
      }
    }
  });


  // Load Grunt plugins.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-include-replace');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-browserify');


  // Task for building JsSIP Grammar.js and Grammar.min.js files.
  grunt.registerTask('grammar', function(){
    var done = this.async();  // This is an async task.
    var sys = require('sys');
    var exec = require('child_process').exec;
    var child;

    // First compile JsSIP grammar with PEGjs.
    console.log('"grammar" task: compiling JsSIP PEGjs grammar into Grammar.js ...');
    child = exec('if [ -x "./node_modules/pegjs/bin/pegjs" ] ; then PEGJS="./node_modules/pegjs/bin/pegjs"; else PEGJS="pegjs" ; fi && $PEGJS -e JsSIP.Grammar src/Grammar/src/Grammar.pegjs src/Grammar/dist/Grammar.js', function(error, stdout, stderr) {
      if (error) {
        sys.print('ERROR: ' + stderr);
        done(false);  // Tell grunt that async task has failed.
      }
      console.log('OK');

      // Then modify the generated Grammar.js file with custom changes.
      console.log('"grammar" task: applying custom changes to Grammar.js ...');
      var fs = require('fs');
      var grammar = fs.readFileSync('src/Grammar/dist/Grammar.js').toString();
      var modified_grammar = grammar.replace(/throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/, 'new this.SyntaxError($1);\n        return -1;$2}$3return data;');
      fs.writeFileSync('src/Grammar/dist/Grammar.js', modified_grammar);
      console.log('OK');
      done();  // Tell grunt that async task has succeeded.

    });
  });

  // Task for building JsSIP SDP.js and SDP.min.js files.
  grunt.registerTask('sdp', function(){
    var done = this.async();  // This is an async task.
    var sys = require('sys');
    var exec = require('child_process').exec;
    var child;

    // Build a bundle of 'sdp-transform' for the browser.
    console.log('"sdp" task: getting JsSIP parser from "sdp-transform" ...');
    child = exec('browserify src/SDP/main.js -o src/SDP/dist/SDP.js', function(error, stdout, stderr) {
      if (error) {
        sys.print('ERROR: ' + stderr);
        done(false);  // Tell grunt that async task has failed.
      }
      console.log('OK');
      done();  // Tell grunt that async task has succeeded.
    });
  });
  
  // Task for building jssip-devel.js (uncompressed), jssip-X.Y.Z.js (uncompressed)
  // and jssip-X.Y.Z.min.js (minified).
  // Both jssip-devel.js and jssip-X.Y.Z.js are the same file with different name.
  grunt.registerTask('build', ['browserify', 'concat:devel', 'includereplace:devel', 'jshint:devel', 'concat:post_devel', 'concat:dist', 'includereplace:dist', 'jshint:dist', 'concat:post_dist', 'uglify:dist']);

  // Task for building jssip-devel.js (uncompressed).
  grunt.registerTask('devel', ['browserify', 'concat:devel', 'includereplace:devel', 'jshint:devel', 'concat:post_devel']);

  // Test tasks.
  grunt.registerTask('testNoWebRTC', ['qunit:noWebRTC']);
  grunt.registerTask('test', ['testNoWebRTC']);

  // Travis CI task.
  // Doc: http://manuel.manuelles.nl/blog/2012/06/22/integrate-travis-ci-into-grunt/
  grunt.registerTask('travis', ['grammar', 'devel', 'test']);

  // Default task is an alias for 'build'.
  grunt.registerTask('default', ['build']);

};
