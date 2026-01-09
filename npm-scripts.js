const process = require('process');
const { execSync } = require('child_process');
const { version } = require('./package.json');

const task = process.argv.slice(2).join(' ');

const ESLINT_PATHS = [ 'gulpfile.js', 'lib', 'test' ].join(' ');

// eslint-disable-next-line no-console
console.log(`npm-scripts.js [INFO] running task "${task}"`);

switch (task)
{
  case 'lint':
  {
    lint();

    break;
  }

  case 'test':
  {
    executeCmd('gulp test');

    break;
  }

  case 'release':
  {
    lint();
    executeCmd('gulp');
    executeCmd(`git commit -am '${version}'`);
    executeCmd(`git tag -a ${version} -m '${version}'`);
    executeCmd('git push origin master && git push origin --tags');
    executeCmd('npm publish');

    // eslint-disable-next-line no-console
    console.log('update tryit-jssip and JsSIP website');

    break;
  }

  default:
  {
    throw new TypeError(`unknown task "${task}"`);
  }
}

function lint()
{
  logInfo('lint()');

  executeCmd(
    `eslint --max-warnings 0 ${ESLINT_PATHS}`
  );
}

function executeCmd(command)
{
  // eslint-disable-next-line no-console
  console.log(`npm-scripts.js [INFO] executing command: ${command}`);

  try
  {
    execSync(command, { stdio: [ 'ignore', process.stdout, process.stderr ] });
  }
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

// eslint-disable-next-line no-unused-vars
function logWarn(...args)
{
  // eslint-disable-next-line no-console
  console.warn(`npm-scripts.mjs \x1b[33m[WARN] [${task}]\x1b\0m`, ...args);
}
