## What you need to build JsSIP

You just need to have [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/).


### Node.js

* [Install Node.js](https://nodejs.org/en/download/)

### Git

* [Install Git](https://git-scm.com/book/en/Getting-Started-Installing-Git)


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

## Test units

```bash
$ npm run test
```


## Development

### Changes in JsSIP Grammar

If you modify `src/Grammar.pegjs` then you need to recompile it:

```bash
$ node npm-scripts.js grammar
```
