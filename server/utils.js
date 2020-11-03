import fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import path from 'path';
import log from './logger';

import { createChan } from './message';
import { CHAN_TYPE, MSG_TYPE, xy2i } from '../common';

export function processMessage({ type, payload }, gameState) {
  switch (type) {
    case MSG_TYPE.COORD:
      gameState.board[xy2i(payload)];
      return;
    default:
      log.e(`Unknown message type: ${type}; with payload ${payload}`);
      return;
  }
}

export function createChannels(args, server) {
  const chans = [];
  for (const cmd of args.bot.slice(0, 2)) {
    chans.push(createChan(CHAN_TYPE.CMD, { cmd }));
  }
  while (chans.length < 2) {
    chans.push(createChan(CHAN_TYPE.WS, { server }));
  }
  return Promise.all(chans);
}

export function initServer(_args) {
  const app = fastify();
  app.register(fastifyStatic, { root: path.resolve(__dirname, 'public/') });
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    log.i(`Browser link: http://127.0.0.1:${port}.`);
  });
  return app;
}
