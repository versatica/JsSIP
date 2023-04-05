const process = require('process');
const { execSync } = require('child_process');
const { version } = require('./package.json');

const task = process.argv.slice(2).join(' ');

// eslint-disable-next-line no-console
console.log(`npm-scripts.js [INFO] running task "${task}"`);

switch (task)
{
  case 'lint':
  {
    execute('gulp lint');

    break;
  }

  case 'test':
  {
    execute('gulp test');

    break;
  }

  case 'prepublish':
  {
    execute('gulp babel');

    break;
  }

  case 'release':
  {
    execute('gulp');
    execute(`git commit -am '${version}'`);
    execute(`git tag -a ${version} -m '${version}'`);
    execute('git push origin master && git push origin --tags');
    execute('npm publish');

    // eslint-disable-next-line no-console
    console.log('update tryit-jssip and JsSIP website');

    break;
  }

  default:
  {
    throw new TypeError(`unknown task "${task}"`);
  }
}

function execute(command)
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
