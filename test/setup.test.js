'use strict';

const { after, before } = require('mocha');
const connect = require('../src/db');

global.conn = null;

before(async function() {
  global.conn = await connect();
});

after(async function() {
  await global.conn.close();
});
