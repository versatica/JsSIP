/**
 * Dependencies.
 */
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gulp = require('gulp');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var header = require('gulp-header');
var expect = require('gulp-expect-file');
var nodeunit = require('gulp-nodeunit-runner');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

const PKG = require('./package.json');

// gulp-header.
const BANNER = fs.readFileSync('banner.txt').toString();
const BANNER_OPTIONS = {
	pkg: PKG,
	currentYear: (new Date()).getFullYear()
};

// gulp-expect-file options.
const EXPECT_OPTIONS = {
	silent: true,
	errorOnFailure: true,
	checkRealFile: true
};

function logError(error)
{
	gutil.log(gutil.colors.red(String(error)));
}

gulp.task('lint', function() {
	var src = ['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'];

	return gulp.src(src)
		.pipe(expect(EXPECT_OPTIONS, src))
		.pipe(jshint('.jshintrc'))
		.pipe(jshint.reporter('jshint-stylish', {verbose: true}))
		.pipe(jshint.reporter('fail'));
});


gulp.task('browserify', function() {
	return browserify(
		{
			entries      : PKG.main,
			extensions   : [ '.js' ],
			// Required for sourcemaps (must be false otherwise).
			debug        : false,
			// Required for watchify (not used here).
			cache        : null,
			// Required for watchify (not used here).
			packageCache : null,
			// Required to be true only for watchify (not used here).
			fullPaths    : false,
			standalone   : PKG.title
		})
		.bundle()
		.on('error', logError)
		.pipe(source(`${PKG.name}.js`))
		.pipe(buffer())
		.pipe(rename(`${PKG.name}.js`))
		.pipe(header(BANNER, BANNER_OPTIONS))
		.pipe(gulp.dest('dist/'));
});


gulp.task('uglify', function() {
	var src = 'dist/' + PKG.name + '.js';

	return gulp.src(src)
		.pipe(expect(EXPECT_OPTIONS, src))
		.pipe(uglify())
		.pipe(header(BANNER, BANNER_OPTIONS))
		.pipe(rename(PKG.name + '.min.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('test', function() {
	// var src = 'test/*.js';
	var src = [
		'test/test-classes.js',
		'test/test-normalizeTarget.js',
		'test/test-parser.js',
		'test/test-properties.js'
		// 'test/test-UA-no-WebRTC.js'
	];

	return gulp.src(src)
		.pipe(expect(EXPECT_OPTIONS, src))
		.pipe(nodeunit({reporter: 'default'}));
});


gulp.task('grammar', function(cb) {
	var local_pegjs = path.resolve('./node_modules/.bin/pegjs');
	var Grammar_pegjs = path.resolve('lib/Grammar.pegjs');
	var Grammar_js = path.resolve('lib/Grammar.js');

	gutil.log('grammar: compiling Grammar.pegjs into Grammar.js...');

	exec(local_pegjs + ' ' + Grammar_pegjs + ' ' + Grammar_js,
		function(error, stdout, stderr) {
			if (error) {
				cb(new Error(stderr));
			}
			gutil.log('grammar: ' + gutil.colors.yellow('done'));

			// Modify the generated Grammar.js file with custom changes.
			gutil.log('grammar: applying custom changes to Grammar.js...');

			var grammar = fs.readFileSync('lib/Grammar.js').toString();
			var modified_grammar = grammar.replace(/throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/, 'new this.SyntaxError($1);\n        return -1;$2}$3return data;');

			modified_grammar = modified_grammar.replace(/\s+$/mg, '');
			fs.writeFileSync('lib/Grammar.js', modified_grammar);
			gutil.log('grammar: ' + gutil.colors.yellow('done'));
			cb();
		}
	);
});


gulp.task('devel', gulp.series('grammar'));
gulp.task('dist', gulp.series('lint', 'test', 'browserify', 'uglify'));
gulp.task('default', gulp.series('dist'));
