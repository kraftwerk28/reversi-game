import yargs from 'yargs';

export function parseArgs() {
  return yargs().array('bot').argv;
}
