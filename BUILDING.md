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

Finally, run `grunt` command with no arguments to get a complete version of JsSIP:
```
$ grunt
```

The built version of JsSIP will be available in the `dist/` subdirectory in both flavors: normal (uncompressed)  and minified, both linted with [JSLint](http://jslint.com/). There will be also a file named `dist/jssip-devel.js` which is an exact copy of the uncompressed file.


## Development version

Run `grunt devel` for just generating the `dist/jssip-devel.js` file. An uncompressed JsSIP source file named `jssip-devel.js` will be created in `dist` directory.


## Test units

JsSIP includes test units based on [QUnit](http://qunitjs.com/). Test units use the `dist/jssip-devel.js` file. Run the tests as follows:
```
$ grunt test

Running "qunit:noWebRTC" (qunit) task
Testing testNoWebRTC.html.........OK
>> 250 assertions passed (177ms)
```

## Changes in JsSIP grammar

If you modify `src/Grammar/src/Grammar.pegjs` then you need to recompile JsSIP grammar files. For that run the following task:
```
$ grunt grammar
```
And then build JsSIP again as explained above.
