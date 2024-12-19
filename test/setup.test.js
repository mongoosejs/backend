'use strict';

require('dotenv').config({ path: './.env.test' });

const connect = require('../src/db');

global.conn = null;

before(async function() {
  global.conn = await connect();
});

after(async function() {
  await global.conn.close();
});
