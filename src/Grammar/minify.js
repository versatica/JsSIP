var compressor = require('node-minify');

// Use GCC Google Closure Compiler
new compressor.minify({
    type: 'gcc',
    fileIn: 'dist/Grammar.js',
    fileOut: 'dist/Grammar.min.js',
    callback: function(err){
        console.log(err);
    }
});
