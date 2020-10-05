'use strict';

import fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import path from 'path';
import yargs from 'yargs';

import { MsgChan } from './message';
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

  const chan1 = new MsgChan('ws', { server: app.server });
  const chan2 = new MsgChan('ws', { server: app.server });
  await Promise.all([chan1.waitConnected(), chan2.waitConnected()]);
  console.log('Channels connected');
}

main();
