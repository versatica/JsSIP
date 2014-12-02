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
$ git clone https://github.com/versatica/JsSIP.git JsSIP
$ cd JsSIP
```

Install grunt-cli globally:
```
$ npm install -g grunt-cli
```

Install the Node.js dependencies:
```
$ npm install
```

Make sure you have `grunt` installed by testing:
```
$ grunt -version
```

Finally, run `grunt dist` (or just `grunt`) to get:

* `builds/jssip-X.Y.Z.js`: uncompressed version of JsSIP.
* `builds/jssip-last.js`: symlink to the uncompressed file.
* `builds/jssip-X.Y.Z.min.js`: compressed version of JsSIP.
* `builds/jssip.js`: copy of the compressed file.

```
$ grunt dist
```


## Test units

```
$ grunt test
```


## Development

### Changes in JsSIP Grammar

If you modify `src/Grammar.pegjs` then you need to recompile it:
```
$ grunt devel
```
And then build JsSIP again as explained above.
