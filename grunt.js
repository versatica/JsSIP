/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
      banner: '/*! jsSIP v@<%= pkg.version %> jssip.net | jssip.net/license */'
    },
    lint: {
      dist: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
      grunt: 'grunt.js'
    },
    concat: {
      dist: {
        src: [
          'src/head.js',
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
          'src/InDialogRequestSender.js',
          'src/Registrator.js',
          'src/Session.js',
          'src/MediaSession.js',
          'src/Message.js',
          'src/UA.js',
          'src/Utils.js',
          'src/SanityCheck.js',
          'src/DigestAuthentication.js',
          'src/WebRTC.js',
          'src/tail.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      },
      post: {
        src: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.js',
          'src/Grammar/dist/Grammar.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      },
      post_min: {
        src: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js',
          'src/Grammar/dist/Grammar.min.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js'
      }
    },
    min: {
      dist: {
        src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js'
      }
    },
    watch: {
      files: '<config:lint.files>',
      tasks: 'lint test'
    },
    jshint: {
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
        unused:true,
        supernew: true
      },
      globals: {}
    },
    qunit: {
      noWebRTC: ['qunitjs/testNoWebRTC.html'],
      WebRTC:   ['qunitjs/testWebRTC.html']
    },
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'concat:dist lint min concat:post concat:post_min');

  // Test tasks.
  grunt.registerTask('testNoWebRTC', 'qunit:noWebRTC');
  grunt.registerTask('testWebRTC', 'qunit:WebRTC');
  grunt.registerTask('test', 'testNoWebRTC');
};
