'use strict';

const mongoose = require('mongoose');

let conn = null;

const accessTokenSchema = require('./AccessToken');
const dashboardResultSchema = require('./DashboardResult');
const invitationSchema = require('./invitation');
const jobSchema = require('./Job');
const openCollectiveSponsorSchema = require('./OpenCollectiveSponsor');
const rateLimitSchema = require('./RateLimit');
const subscriberSchema = require('./subscriber');
const taskSchema = require('./task');
const userSchema = require('./user');
const workspaceSchema = require('./workspace');

const uri = process.env.MONGODB_CONNECTION_STRING;

module.exports = async function connect() {
  if (conn == null) {
    conn = mongoose.createConnection(uri);
    await conn.asPromise();
  }
  conn.model('AccessToken', accessTokenSchema, 'AccessToken');
  conn.model('DashboardResult', dashboardResultSchema, 'DashboardResult');
  conn.model('Invitation', invitationSchema, 'Invitation');
  conn.model('Job', jobSchema, 'Job');
  conn.model('OpenCollectiveSponsor', openCollectiveSponsorSchema, 'OpenCollectiveSponsor');
  conn.model('RateLimit', rateLimitSchema, 'RateLimit');
  conn.model('Subscriber', subscriberSchema, 'Subscriber');
  conn.model('Task', taskSchema, 'Task');
  conn.model('User', userSchema, 'User');
  conn.model('Workspace', workspaceSchema, 'Workspace');

  return conn;
};
