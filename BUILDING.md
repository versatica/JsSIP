## What you need to build JsSIP

You just need to have [Node.js](http://nodejs.org/), [Git](http://git-scm.com/) and [PhantomJS](http://phantomjs.org/) installed.

### Node.js

* [Install Node.js via package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
* [Install Node.js from sources](http://nodejs.org)

### Git

* [Install Git](http://git-scm.com/book/en/Getting-Started-Installing-Git)


### PhantomJS

* [Install PhantomJS](http://phantomjs.org/download.html)
* In modern Debian/Ubuntu systems PhantomJS can be installed via `apt-get install phantomjs`


## How to build JsSIP

Clone a copy of the main JsSIP git repository by running:
```
git clone https://github.com/versatica/JsSIP.git
```

Enter the directory and install the Node.js dependencies:
```
cd JsSIP && npm install
```

Make sure you have `grunt` installed by testing:
```
grunt -version
```

Finally, to run the test units and get a complete version of JsSIP, type the following:
```
grunt
```

The built version of JsSIP will be available in the `dist/` subdirectory in both flavors: normal and minified. Both linted (with [JSHint](http://www.jshint.com/)).
