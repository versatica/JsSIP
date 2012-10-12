/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
      banner: "/*! jsSIP v@<%= pkg.version %> jssip.net | jssip.net/license */"
    },
    lint: {
      dist: "dist/<%= pkg.name %>-<%= pkg.version %>.js",
      grunt: "grunt.js"
    },
    concat: {
      dist: {
        src: [
          "src/head.js",
          "src/EventEmitter.js",
          "src/constants.js",
          "src/exceptions.js",
          "src/timers.js",
          "src/Transport.js",
          "src/Parser.js",
          "src/SIPMessage.js",
          "src/Transactions.js",
          "src/Dialogs.js",
          "src/RequestSender.js",
          "src/Registrator.js",
          "src/Session.js",
          "src/MediaSession.js",
          "src/Subscriber.js",
          "src/dialog-info.js",
          "src/UA.js",
          "src/utils.js",
          "src/SanityCheck.js",
          "src/DigestAuthentication.js",
          "src/tail.js"
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      },
      post: {
        src: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.js',
          "src/grammar/grammar_rfc3261.js"
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
      },
      post_min: {
        src: [
        'dist/<%= pkg.name %>-<%= pkg.version %>.min.js',
        "src/grammar/grammar_rfc3261.min.js"
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
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'concat:dist lint min');
  grunt.registerTask('post', 'concat:post concat:post_min' );
};
