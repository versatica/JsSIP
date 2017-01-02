## What you need to build JsSIP

You just need to have [Node.js](http://nodejs.org/) and [Git](http://git-scm.com/).


### Node.js

* [Install Node.js via package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
* [Install Node.js from sources](http://nodejs.org)

### Git

* [Install Git](http://git-scm.com/book/en/Getting-Started-Installing-Git)


## How to build JsSIP

Clone a copy of the main JsSIP git repository by running:

```bash
$ git clone https://github.com/versatica/JsSIP.git JsSIP
$ cd JsSIP
```

Install `gulp-cli` (>= 1.2.2) globally (which provides the `gulp` command):

```bash
$ npm install -g gulp-cli
```

(you can also use the local `gulp` executable located in `node_modules/.bin/gulp`).

Install the Node.js dependencies:

```bash
$ npm install
```

Finally, run `gulp dist` (or just `gulp`) to get:

* `dist/jssip.js`: uncompressed version of JsSIP.
* `dist/jssip.min.js`: compressed version of JsSIP.

```bash
$ gulp dist
```


## Test units

```bash
$ gulp test
```


## Development

### Changes in JsSIP Grammar

If you modify `lib/Grammar.pegjs` then you need to recompile it:

```bash
$ gulp devel
$ gulp dist
```

