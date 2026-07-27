import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const defaultValue = '+75d';
const faketimeLib = '/usr/lib/x86_64-linux-gnu/faketime/libfaketime.so.1';
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function printHint() {
  console.log('\nHint: FAKETIME accepts relative offsets and absolute/start-at dates.');
  console.log('Examples:');
  console.log('  +14d   -> 14 days in the future');
  console.log('  -10m   -> 10 minutes in the past');
  console.log('  2020-12-24 20:30:00  -> absolute time');
  console.log('  @2020-12-24 20:30:00 -> start-at time');
}

async function askForValue() {
  if (!process.stdin.isTTY) {
    return defaultValue;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = (await rl.question(`Use the default faketime value ${defaultValue}? [Y/n]: `)).trim().toLowerCase();

    if (answer === '' || answer === 'y' || answer === 'yes') {
      return defaultValue;
    }

    if (answer === 'n' || answer === 'no') {
      printHint();
      const customValue = (await rl.question('Enter a custom FAKETIME value: ')).trim();
      return customValue || defaultValue;
    }

    console.log('Unrecognized answer. Using the default value.');
    return defaultValue;
  } finally {
    rl.close();
  }
}

async function main() {
  if (!fs.existsSync(faketimeLib)) {
    console.error(`libfaketime was not found at ${faketimeLib}.`);
    process.exit(1);
  }

  const faketimeValue = await askForValue();

  console.log(`Starting backend dev server with LD_PRELOAD=${faketimeLib} and FAKETIME=${faketimeValue}`);

  const child = spawn(npmCommand, ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      LD_PRELOAD: faketimeLib,
      FAKETIME: faketimeValue,
    },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });

  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
