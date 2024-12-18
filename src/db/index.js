'use strict';

const mongoose = require('mongoose');

let conn = null;

const accessTokenSchema = require('./AccessToken');
const jobSchema = require('./Job');
const subscriberSchema = require('./subscriber');
const taskSchema = require('./task');

const uri = process.env.MONGODB_CONNECTION_STRING;

module.exports = async function connect() {
  if (conn == null) {
    conn = mongoose.createConnection(uri);
    await conn.asPromise();
  }
  conn.model('AccessToken', accessTokenSchema, 'AccessToken');
  conn.model('Job', jobSchema, 'Job');
  conn.model('Subscriber', subscriberSchema, 'Subscriber');
  conn.model('Task', taskSchema, 'Task');

  return conn;
};