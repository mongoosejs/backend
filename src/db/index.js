'use strict';

const config = require('../../.config');
const mongoose = require('mongoose');

let conn = null;

const subscriberSchema = require('./subscriber');

module.exports = async function connect() {
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }
  conn.model('Subscriber', subscriberSchema, 'Subscriber');

  return conn;
};