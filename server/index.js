import fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import path from 'path';
import * as yargs from 'yargs';

import { createChan } from './message';
import { CHAN_TYPE, MSG_TYPE, COLOR, initGame, xy2i } from '../common';

/**
 * Used for (future) move validation
 */
function performMove(gameState, coord) {
  gameState.board[xy2i(coord.x, coord.y)];
}

/**
 * Reducer
 */
function processMessage({ type, payload }, gameState) {
  switch (type) {
    case MSG_TYPE.COORD:
      performMove(gameState, payload);
      return;
    default:
      console.error(`Unknown message type: ${type}; with payload ${payload}`);
      return;
  }
}

function createChannels(args, server) {
  const chans = [];
  for (const cmd of args.bot.slice(0, 2)) {
    chans.push(createChan(CHAN_TYPE.CMD, { cmd }));
  }
  while (chans.length < 2) {
    chans.push(createChan(CHAN_TYPE.WS, { server }));
  }
  return Promise.all(chans);
}

function initServer(_args) {
  const app = fastify();
  app.register(fastifyStatic, { root: path.resolve(__dirname, 'public/') });
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.info(`Browser link: http://127.0.0.1:${port}.`);
  });
  return app;
}

async function main() {
  const args = yargs
    .array('b')
    .default('b', [])
    .alias('b', 'bot')
    .describe('b', 'Provide a shell command to run a bot (up to 2).')
    .alias('s', 'singleplayer')
    .boolean('s')
    .describe('s', 'Don\'t open any websocket, just serve static.')
    .default('s', false)
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
  chan1.send({ type: MSG_TYPE.COLOR, payload: COLOR.black });
  chan2.send({ type: MSG_TYPE.COLOR, payload: COLOR.white });

  while (true) {
    const blMsg = await chan1.recv();
    processMessage(blMsg, gameState);
    chan1.send(blMsg);
    chan2.send(blMsg);

    const whMsg = await chan2.recv();
    processMessage(whMsg, gameState);
    chan1.send(whMsg);
    chan2.send(whMsg);
  }
}

main().catch((error) => {
  console.error(error);
});
