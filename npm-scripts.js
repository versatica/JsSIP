const fs = require('fs');
const path = require('path');
const process = require('process');
const { execSync } = require('child_process');
const { version } = require('./package.json');

const task = process.argv.slice(2).join(' ');

const ESLINT_PATHS = [ 'gulpfile.js', 'src', 'test' ].join(' ');

// eslint-disable-next-line no-console
console.log(`npm-scripts.js [INFO] running task "${task}"`);

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

function lint()
{
  logInfo('lint()');

  executeCmd(`eslint -c eslint.config.js --max-warnings 0 ${ESLINT_PATHS}`);
}

function test()
{
  logInfo('test()');

  executeCmd('jest test/test-classes.js');
  executeCmd('jest test/test-digestAuthentication.js');
  executeCmd('jest test/test-normalizeTarget.js');
  executeCmd('jest test/test-properties.js');
  executeCmd('gulp test');

  // executeCmd(jest);
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
