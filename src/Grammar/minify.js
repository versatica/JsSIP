var compressor = require('node-minify');

var compressors = ['gcc','yui-js','uglifyjs','sqwish'];

// Use GCC Google Closure Compiler by default
var compressorType = process.argv[2] || 'gcc';

if (compressors.indexOf(compressorType) === -1 ) {
  console.log(
    'Wrong compressor type specified. ' +
    'The supported compressor types are: '+ compressors.join(', ')
  );
} else {
  new compressor.minify({
      type: compressorType,
      fileIn: 'dist/Grammar.js',
      fileOut: 'dist/Grammar.min.js',
      callback: function(err){
        console.log(err);
      }
  });
}
