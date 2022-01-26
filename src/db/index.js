'use strict';

const config = require('../../.config');
const mongoose = require('mongoose');

let conn = null;

const accessTokenSchema = require('./AccessToken');
const jobSchema = require('./Job');
const subscriberSchema = require('./subscriber');
const taskSchema = require('./task');

module.exports = async function connect() {
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }
  conn.model('AccessToken', accessTokenSchema, 'AccessToken');
  conn.model('Job', jobSchema, 'Job');
  conn.model('Subscriber', subscriberSchema, 'Subscriber');
  conn.model('Task', taskSchema, 'Task');

  return conn;
};