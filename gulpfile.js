/* eslint-disable strict */
'use strict';
/* eslint-enable strict */

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const gulp = require('gulp');
const expect = require('gulp-expect-file');
const nodeunit = require('gulp-nodeunit-runner');
const log = require('fancy-log');
const colors = require('ansi-colors');

// gulp-expect-file options.
const EXPECT_OPTIONS = {
  silent         : true,
  errorOnFailure : true,
  checkRealFile  : true
};

gulp.task('test', function()
{
  // var src = 'test/*.js';
  const src = [
    'test/test-classes.js',
    'test/test-normalizeTarget.js',
    'test/test-parser.js',
    'test/test-properties.js',
    'test/test-UA-no-WebRTC.js',
    'test/test-digestAuthentication.js'
  ];

  return gulp.src(src)
    .pipe(expect(EXPECT_OPTIONS, src))
    .pipe(nodeunit({ reporter: 'default' }));
});

gulp.task('grammar', function(cb)
{
  const local_pegjs = path.resolve('./node_modules/.bin/pegjs');
  const Grammar_pegjs = path.resolve('lib/Grammar.pegjs');
  const Grammar_js = path.resolve('lib/Grammar.js');

  log('grammar: compiling Grammar.pegjs into Grammar.js...');

  exec(`${local_pegjs } ${ Grammar_pegjs } ${ Grammar_js}`,
    function(error, stdout, stderr)
    {
      if (error)
      {
        cb(new Error(stderr));
      }
      log(`grammar: ${ colors.yellow('done')}`);

      // Modify the generated Grammar.js file with custom changes.
      log('grammar: applying custom changes to Grammar.js...');

      const grammar = fs.readFileSync('lib/Grammar.js').toString();
      let modified_grammar = grammar.replace(/throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/, 'new this.SyntaxError($1);\n        return -1;$2}$3return data;');

      modified_grammar = modified_grammar.replace(/\s+$/mg, '');
      fs.writeFileSync('lib/Grammar.js', modified_grammar);
      log(`grammar: ${ colors.yellow('done')}`);
      cb();
    }
  );
});

gulp.task('devel', gulp.series('grammar'));

gulp.task('dist', gulp.series('test'));

gulp.task('default', gulp.series('dist'));
