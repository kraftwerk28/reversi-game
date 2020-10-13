'use strict';

import fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import path from 'path';
import yargs from 'yargs';

import { MsgChan, CHAN_TYPE } from './message';
import { parseArgs } from './args';

async function main() {
  console.log(parseArgs());
  // TODO: Run bots or websockets in respect to args.

  const app = fastify();
  app.register(fastifyStatic, { root: path.resolve(__dirname, 'public/') });
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
  });

  const chan1 = new MsgChan(CHAN_TYPE.WS, { server: app.server });
  const chan2 = new MsgChan(CHAN_TYPE.WS, { server: app.server });
  console.info('Waiting for connections.');
  await Promise.all([chan1.waitConnected(), chan2.waitConnected()]);
  console.info('Channels connected');

  while (true) {
    const msg = await chan1.recv();
    console.info(msg);
    chan2.send(msg.type, msg.payload);
  }
}

main();
