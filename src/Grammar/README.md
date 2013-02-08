JsSIP Parser Grammar
======================

JsSIP uses [PEG.js](https://github.com/dmajda/pegjs) to build its parser grammar, a PEG based parser generator for JavaScript.

The grammar source is defined in PEG format in `src/Grammar.pegjs` file. It must be converted to JavaScript by using PEG.js


PEG.js Installation
------------------

In order to use the `pegjs` node command, install PEG.js globally:

    $ npm install -g pegjs


Generating the Grammar parser from the Grammar source
-----------------------------------------------------

The following command converts the PEG grammar into a JsSIP module named `Grammar`. The output file is created in `dist/Grammar.js`.

    $ pegjs -e JsSIP.Grammar src/Grammar.pegjs dist/Grammar.js

In case there is an error in the grammar, the command will throw a descriptive error.

Once compiled, there are couple of changes that need to be done in `dist/Grammar.js`. This is because the PEG.js grammar parser, by default, returns an Array (representing a splitted version of the input) if the input matched the given rule, but JsSIP `Grammar.pegjs` generates internally a SIP Header Oject instead and this is what JsSIP expects as the result of the `Grammar.parse()` function.

The changes to be done in `dist/Grammar.js` file are located at the end of the `parse()` function, just where it returns the Array for successful parsing or throws an exception for parsing error:

* Return `-1` instead of throwing an exception for a parsing error.
* Return expected `msg` object instead of the default Array for a successful parsing.

```
      if (result === null || pos !== input.length) {
        var offset = Math.max(pos, rightmostFailuresPos);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = computeErrorPosition();

-       throw new this.SyntaxError(`
+       new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );

+       return -1;
      }

-       return result;
+       return data;
    },

    /* Returns the parser source code. */
    toSource: function() { return this._source; }
```

Minifying the Grammar parser
-----------------------------

[node-minify](https://github.com/srod/node-minify) is used in order to minify the generated grammar.

Install node-minify

    $ npm install node-minify

Run the `minify.js` script with node command to minimize the grammar.

    $ node minify.js

This will generate the `dist/Grammar.min.js` file.