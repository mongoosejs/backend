'use strict';

const assert = require('assert');
const localMongoUri = 'mongodb://127.0.0.1:27017/mongoose_local';

process.env.MONGODB_CONNECTION_STRING = localMongoUri;

const connect = require('../src/db');

assert.ok(
  process.env.MONGODB_CONNECTION_STRING && process.env.MONGODB_CONNECTION_STRING.includes('127.0.0.1'),
  'Can only seed localhost!'
);

run().catch(err => {
  console.log(err);
  process.exit(-1);
});

async function run() {
  const conn = await connect();

  await conn.dropDatabase();

  const { User, Workspace } = conn.models;

  const user = await User.create({
    email: 'val@karpov.io',
    githubUsername: 'vkarpov15',
    githubUserId: '1620265',
    name: 'Valeri Karpov'
  });
  await User.create({
    email: 'daniel@meanitsoftware.com',
    githubUsername: 'IslandRhythms',
    githubUserId: '39510674',
    name: 'Daniel Diaz'
  });

  const workspace = await Workspace.create({
    name: 'Mongoose Studio Local Test',
    apiKey: 'TACO',
    ownerId: user._id,
    members: [{ userId: user._id, roles: ['owner'] }]
  });

  console.log(`Created user ${user.email}`);
  console.log(`Created workspace ${workspace.name} (${workspace.apiKey})`);
  process.exit(0);
}
