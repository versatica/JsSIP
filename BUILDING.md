## What you need to build JsSIP

You just need to have [Node.js](http://nodejs.org/) and [Git](http://git-scm.com/). Optionally you also need [PhantomJS](http://phantomjs.org/) if you want to run test units.


### Node.js

* [Install Node.js via package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
* [Install Node.js from sources](http://nodejs.org)

### Git

* [Install Git](http://git-scm.com/book/en/Getting-Started-Installing-Git)


### PhantomJS

(optional, just for running test units)

* [Install PhantomJS](http://phantomjs.org/download.html)
* In modern Debian/Ubuntu systems PhantomJS can be installed via `apt-get install phantomjs`


## How to build JsSIP

Clone a copy of the main JsSIP git repository by running:
```
$ git clone https://github.com/versatica/JsSIP.git
```

Enter the directory and install the Node.js dependencies:
```
$ cd JsSIP && npm install
```

Make sure you have `grunt` installed by testing:
```
$ grunt -version
```

Finally, run the test units and get a complete version of JsSIP:
```
$ grunt
```

The built version of JsSIP will be available in the `dist/` subdirectory in both flavors: normal and minified. Both linted with [JSHint](http://www.jshint.com/).


## Running test units

JsSIP includes test units based on [QUnit](http://qunitjs.com/). Run them as follows:
```
$ grunt test

Running "qunit:noWebRTC" (qunit) task
Testing testNoWebRTC.html.........OK
>> 206 assertions passed (213ms)
```
