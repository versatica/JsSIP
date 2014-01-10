## JsSIP Parser Grammar

JsSIP uses [PEG.js](http://pegjs.majda.cz/) to build its SIP parser grammar, a PEG based parser generator for JavaScript. The grammar source is defined in PEG format in `src/Grammar.pegjs` file. It is converted to JavaScript with PEG.js.


### Compiling JsSIP Grammar

```
$ grunt grammar
```
