'use strict';

const assert = require('assert');
const config = require('../.config');
const connect = require('../src/db');

assert.ok(config.uri.includes('localhost'), 'Can only seed localhost!');

run().catch(err => {
  console.log(err);
  process.exit(-1);
});

async function run() {
  const conn = await connect();

  await conn.dropDatabase();

  const { Subscriber } = conn.models;

  await Subscriber.create([
    {
      githubUsername: 'vkarpov15',
      githubUserId: '1620265'
    },
    {
      githubUsername: 'IslandRhythms',
      githubUserId: '39510674'
    }
  ]);

  console.log('Done');
  process.exit(0);
}