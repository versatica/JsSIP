## JsSIP Parser Grammar

JsSIP uses [PEG.js](https://github.com/dmajda/pegjs) to build its parser grammar, a PEG based parser generator for JavaScript.

The grammar source is defined in PEG format in `src/Grammar.pegjs` file. It must be converted to JavaScript by using PEG.js


### PEG.js Installation


In order to use the `pegjs` node command, install PEG.js globally:
```
$ npm install -g pegjs
```

### Compiling JsSIP Grammar

There are two ways for achieving this task:

* Automatically by running `grunt grammar` in the JsSIP root directory.
* Manually by following steps below one by one:


#### Generating the Grammar parser from the Grammar source

The following command converts the PEG grammar into a JsSIP module named `Grammar`. The output file is created in `dist/Grammar.js`.
```
$ pegjs -e JsSIP.Grammar src/Grammar.pegjs dist/Grammar.js
```

In case there is an error in the grammar, the command will throw a descriptive error.

```
