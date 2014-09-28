## What you need to build JsSIP

You just need to have [Node.js](http://nodejs.org/) and [Git](http://git-scm.com/).


### Node.js

* [Install Node.js via package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
* [Install Node.js from sources](http://nodejs.org)

### Git

* [Install Git](http://git-scm.com/book/en/Getting-Started-Installing-Git)


## How to build JsSIP

Clone a copy of the main JsSIP git repository by running:
```
$ git clone https://github.com/versatica/JsSIP.git
```

Install grunt-cli globally:
```
$ npm install -g grunt-cli
```

Enter the directory and install the Node.js dependencies:
```
$ cd JsSIP && npm install
```

Make sure you have `grunt` installed by testing:
```
$ grunt -version
```

Finally, run `grunt dist` (or just `grunt`) to get an uncompressed version of JsSIP located at `builds/jssip-X.Y.Z.js` and a symlink `builds/jssip-last.js` pointing to it:
```
$ grunt dist
```

In order to get a minified/production version of JsSIP run `grunt min` (note that you must have executed `grunt dist` before):
```
$ grunt min
```


## Test units

JsSIP includes test units based on [QUnit](http://qunitjs.com/). Test units use the `builds/jssip-last.js` file. Run the tests as follows:
```
$ grunt test
```


## Development

### Changes in JsSIP Grammar

If you modify `src/Grammar/src/Grammar.pegjs` then you need to recompile JsSIP Grammar file:
```
$ grunt grammar
```
And then build JsSIP again as explained above.

### Changes in JsSIP SDP

If you modify `src/SDP/main.js` then you need to recompile JsSIP SDP file:
```
$ grunt sdp
```
And then build JsSIP again as explained above.
