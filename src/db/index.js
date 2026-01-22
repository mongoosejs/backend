'use strict';

const mongoose = require('mongoose');

const accessTokenSchema = require('./AccessToken');
const contentSchema = require('./content');
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
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (Object.keys(mongoose.models).length === 0) {
    mongoose.model('AccessToken', accessTokenSchema, 'AccessToken');
    mongoose.model('Content', contentSchema, 'Content');
    mongoose.model('DashboardResult', dashboardResultSchema, 'DashboardResult');
    mongoose.model('Invitation', invitationSchema, 'Invitation');
    mongoose.model('Job', jobSchema, 'Job');
    mongoose.model('OpenCollectiveSponsor', openCollectiveSponsorSchema, 'OpenCollectiveSponsor');
    mongoose.model('RateLimit', rateLimitSchema, 'RateLimit');
    mongoose.model('Subscriber', subscriberSchema, 'Subscriber');
    mongoose.model('Task', taskSchema, 'Task');
    mongoose.model('User', userSchema, 'User');
    mongoose.model('Workspace', workspaceSchema, 'Workspace');
  }

  return mongoose.connection;
};
