import * as yargs from 'yargs';
import { initServer, createChannels } from './utils';
import { GameState } from './game';

async function main() {
  const args = yargs
    .option('bot', {
      alias: 'b',
      type: 'array',
      default: [],
      desc: 'Provide a shell command to run a bot (up to 2 bots).',
    })
    .option('singleplayer', {
      alias: 's',
      type: 'boolean',
      default: false,
      desc: 'No players or bots are involved, just play with youself.',
    })
    .option('delay', {
      alias: 'd',
      type: 'number',
      desc: 'Delay in ms between bot moves (WIP)',
      implies: 'bot',
      default: 0,
    })
    .strict()
    .help()
    .argv;

  const fastifyApp = await initServer(args);
  if (args.singleplayer) {
    return;
  }

  // const gameState = initGame(args);
  const channels = await createChannels(args, fastifyApp.server);
  console.info('Channels connected.');

  const gameState = new GameState(args, channels);
  await gameState.run();
}

main().catch((error) => {
  console.error(error);
});
