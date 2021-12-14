'use strict';

const axios = require('axios');
const azureWrapper = require('../util/azureWrapper');
const { createTokenAuth } = require('@octokit/auth-token');
const config = require('../.config');
const connect = require('../src/db');

module.exports = azureWrapper(async function webhookGitHubComment(context, req) {
  const conn = await connect();
  Subscriber = conn.model('Subscriber');
  const Task = conn.model('Task');

  const task = await Task.create({
    method: req.method,
    url: req.url,
    params: req.body
  });

  const { token } = await createTokenAuth(config.githubAccessTokenForMongoose)();

  const { action, issue, sender } = req.body;

  await task.log(`Action: ${action}`);

  if (action === 'opened' && issue != null) {
    // Opened new issue
    await task.log('Opened new issue');
    const orgs = await axios.get(sender['organizations_url']).then(res => res.data);
    const orgNames = orgs.map(org => org.login);
    const orgIds = orgs.map(org => org.id);

    const subscriber = await Subscriber.findOne({
      $or: [
        { githubUsername: sender.login },
        { githubUserId: sender.id },
        { githubOrganization: { $in: orgNames } },
        { githubOrganizationId: { $in: orgIds } },
        { 'githubOrganizationMembers.login': sender.login },
        { 'githubOrganizationMembers.id': sender.id }
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
  } else {
    await task.log('Skipped');
  }

  return { ok: 1 };
});