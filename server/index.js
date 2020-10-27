import * as yargs from 'yargs';
import { CHAN_TYPE, MSG_TYPE, COLOR, initGame, i2xy } from '../common';
import { initServer, createChannels, processMessage } from './utils';

async function main() {
  const args = yargs
    .option('bot', {
      alias: 'b',
      type: 'array',
      default: [],
      desc: 'Provide a shell command to run a bot (up to 2).'
    })
    .option('singleplayer', {
      alias: 's',
      type: 'boolean',
      default: false,
      desc: 'Don\'t open any websocket, just serve static files.'
    })
    .option('delay', {
      alias: 'd',
      type: 'number',
      desc: 'Delay in ms between bot moves',
    })
    .strict()
    .help()
    .argv;

  const fastifyApp = await initServer(args);
  if (args.singleplayer) {
    return;
  }

  const gameState = initGame(args);
  const [chan1, chan2] = await createChannels(args, fastifyApp.server);
  console.info('Channels connected.');

  // Game process
  const blackHoleCoord = i2xy(gameState.blackHole);
  chan1.send({ type: MSG_TYPE.COORD, payload: blackHoleCoord });
  chan2.send({ type: MSG_TYPE.COORD, payload: blackHoleCoord });
  chan1.send({ type: MSG_TYPE.COLOR, payload: COLOR.black });
  chan2.send({ type: MSG_TYPE.COLOR, payload: COLOR.white });

  while (true) {
    const blMsg = await chan1.recv();
    processMessage(blMsg, gameState);
    if (chan1.type === CHAN_TYPE.WS) {
      chan1.send(blMsg);
    }
    chan2.send(blMsg);

    const whMsg = await chan2.recv();
    processMessage(whMsg, gameState);
    chan1.send(whMsg);
    if (chan2.type === CHAN_TYPE.WS) {
      chan2.send(whMsg);
    }
  }
}

main().catch((error) => {
  console.error(error);
});
