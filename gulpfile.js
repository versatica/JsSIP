/* eslint-disable strict */
'use strict';
/* eslint-enable strict */

const gulp = require('gulp');
const expect = require('gulp-expect-file');
const nodeunit = require('gulp-nodeunit-runner');

// gulp-expect-file options.
const EXPECT_OPTIONS = {
  silent         : true,
  errorOnFailure : true,
  checkRealFile  : true
};

gulp.task('test', function()
{
  const src = [
    'test/test-parser.js',
    'test/test-properties.js',
    'test/test-UA-no-WebRTC.js'
  ];

  return gulp.src(src)
    .pipe(expect(EXPECT_OPTIONS, src))
    .pipe(nodeunit({ reporter: 'default' }));
});
