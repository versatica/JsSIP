## What you need to build JsSIP

You just need to have [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/).


## How to build JsSIP

Clone JsSIP git repository by running:

```bash
$ git clone https://github.com/versatica/JsSIP.git JsSIP
$ cd JsSIP
```

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
