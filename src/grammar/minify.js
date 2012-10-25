var compressor = require('node-minify');

// Use GCC Google Closure Compiler
new compressor.minify({
    type: 'gcc',
    fileIn: 'dist/grammar.js',
    fileOut: 'dist/grammar.min.js',
    callback: function(err){
        console.log(err);
    }
});
