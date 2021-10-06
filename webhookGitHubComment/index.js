'use strict';

const axios = require('axios');
const azureWrapper = require('../util/azureWrapper');
const { createTokenAuth } = require('@octokit/auth-token');
const config = require('../.config');
const mongoose = require('mongoose');

let conn = null;
const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true },
  githubUsername: { type: String, required: true },
  githubUserId: { type: String },
  githubOrganization: { type: String },
  githubOrganizationId: { type: String }
});

module.exports = azureWrapper(async function webhookGitHubComment(context, req) {
  let Subscriber;
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }

  Subscriber = conn.model('Subscriber', subscriberSchema, 'Subscriber');

  const { token } = await createTokenAuth(config.githubAccessTokenForMongoose)();

  const { action, issue, sender } = req.body;

  if (action === 'opened' && issue != null) {
    // Opened new issue
    const orgs = await axios.get(sender['organizations_url']).then(res => res.data);
    const orgNames = orgs.map(org => org.login);
    const orgIds = orgs.map(org => org.id);

    const subscriber = await Subscriber.findOne({
      $or: [
        { githubUsername: sender.login },
        { githubUserId: sender.id },
        { githubOrganization: { $in: orgNames } },
        { githubOrganizationId: { $in: orgIds } }
      ]
    });

    if (subscriber == null) {
      return { ok: 1 };
    }

    // Is a subscriber, add priority label
    await axios.post(`${issue.url}/labels`, { labels: ['priority'] }, {
      headers: {
        authorization: `bearer ${token}`
      }
    });

    // Send to Slack
    const url = 'https://slack.com/api/chat.postMessage';
    await axios.post(url, {
      channel: '#pro-notifications',
      blocks: [
        {type: 'divider'},
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*NEW ISSUE CREATED!* \n\n ${issue.user.login} has posted an issue titled: ${issue.title}`
          }
        },
        {type: 'divider'},
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*DESCRIPTION* \n\n ${issue.body}`
          }
        }, 
      ]
    }, { headers: { authorization: `Bearer ${config.slackToken}` } });
  }

  return { ok: 1 };
});