import * as yargs from 'yargs';

export function parseArgs() {
  return yargs.array('bot').help().argv;
}
