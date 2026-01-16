const esbuild = require("esbuild");
const fs = require('fs');
const path = require('path');
const process = require('process');
const { execSync } = require('child_process');
const pkg = require('./package.json');

const task = process.argv.slice(2).join(' ');
const taskArgs = process.argv.slice(3).join(' ');

const ESLINT_PATHS = [ 'src', 'test' ].join(' ');

logInfo(`running task "${task}"`);
logInfo(taskArgs ? `[args:"${taskArgs}"]` : '');

void run();

async function run() {
  switch (task)
  {
    case 'grammar': {
      grammar();
      break;
    }

    case 'lint': {
      lint();
      break;
    }

    case 'test': {
      test();
      break;
    }

    case 'build': {
      await build(true /* minify */);
      await build(false /* minify */);

      break;
    }

  case 'typescript:build': {
    buildTypescript();

    break;
  }

  case 'release': {
    lint();
    test();
    executeCmd(`git commit -am '${version}'`);
    executeCmd(`git tag -a ${version} -m '${version}'`);
    executeCmd('git push origin master && git push origin --tags');
    executeCmd('npm publish');

      // eslint-disable-next-line no-console
      console.log('update tryit-jssip and JsSIP website');
      break;
    }

    default: {
      throw new TypeError(`unknown task "${task}"`);
    }
  }
}

function lint()
{
  logInfo('lint()');

  executeCmd(`eslint -c eslint.config.js --max-warnings 0 ${ESLINT_PATHS}`);
}

function test()
{
  logInfo('test()');

  executeCmd('jest');
}

function grammar()
{
  logInfo('grammar()');

  const local_pegjs = path.resolve('./node_modules/.bin/pegjs');
  const Grammar_pegjs = path.resolve('src/Grammar.pegjs');
  const Grammar_js = path.resolve('src/Grammar.js');

  logInfo('compiling Grammar.pegjs into Grammar.js...');

  executeCmd(`${local_pegjs} ${Grammar_pegjs} ${Grammar_js}`);

  logInfo('grammar compiled');

  // Modify the generated Grammar.js file with custom changes.
  logInfo('applying custom changes to Grammar.js...');

  const current_grammar = fs.readFileSync('src/Grammar.js').toString();
  let modified_grammar = current_grammar.replace(
    /throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/,
    'new this.SyntaxError($1);\n        return -1;$2}$3return data;'
  );

  modified_grammar = modified_grammar.replace(/\s+$/gm, '');
  fs.writeFileSync('src/Grammar.js', modified_grammar);

  logInfo('grammar done');
}

// Build sources into a file for publishing.
async function build(minify = true) {
  const entry = path.resolve("src/JsSIP.js");
  const outfile = path.resolve("./dist", `jssip${minify ? '.min' : ''}.js`);
  const banner = `
 /*
  * JsSIP ${pkg.version}
  * ${pkg.description}
  * Copyright: 2012-${new Date().getFullYear()} ${pkg.contributors.join(' ')}
  * Homepage: ${pkg.homepage}
  * License: ${pkg.license}
  */`;

  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify,
    sourcemap: false,
    // https://esbuild.github.io/api/#global-name.
    format: "iife",
    globalName: "JsSIP",
    platform: "browser",
    target: ["es2015"],
    // Make the generated output a single line.
    supported: {
      "template-literal": false,
    },
    // Add banner.
    banner: {
      js: banner,
    },
  });
}

function buildTypescript()
{
  logInfo('buildTypescript()');

  deleteLib();

  // Generate .js CommonJS code and .d.ts TypeScript declaration files in lib/.
  executeCmd(`tsc ${taskArgs}`);

  executeCmd('cpx \'src/**/**.d.ts\' lib/');
}

function deleteLib()
{
  if (!fs.existsSync('lib'))
  {
    return;
  }

  logInfo('deleteLib()');

  fs.rmSync('lib', { recursive: true, force: true });
}

function executeCmd(command)
{
  // eslint-disable-next-line no-console
  console.log(`npm-scripts.js [INFO] executing command: ${command}`);

  try
  {
    execSync(command, { stdio: [ 'ignore', process.stdout, process.stderr ] });
  }
  // eslint-disable-next-line no-unused-vars
  catch (error)
  {
    process.exit(1);
  }
}

function logInfo(...args)
{
  // eslint-disable-next-line no-console
  console.log(`npm-scripts.mjs \x1b[36m[INFO] [${task}]\x1b[0m`, ...args);
}
