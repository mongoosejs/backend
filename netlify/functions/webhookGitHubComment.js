'use strict';

const axios = require('axios');
const createReleaseFromChangelog = require('../../src/actions/createReleaseFromChangelog');
const { createTokenAuth } = require('@octokit/auth-token');
const connect = require('../../src/db');
const extrovert = require('extrovert');

const ignoreUsers = new Set((process.env.IGNORE_GITHUB_USERS || '').split(','));
const githubAccessTokenForMongoose = process.env.GITHUB_ACCESS_TOKEN_FOR_MONGOOSE;
const slackToken = process.env.SLACK_TOKEN;

module.exports = extrovert.toNetlifyFunction(async function webhookGitHubComment(params) {
  const conn = await connect();
  const Subscriber = conn.model('Subscriber');

  const { token } = await createTokenAuth(githubAccessTokenForMongoose)();

  const { action, issue, sender, ref, ref_type } = params;

  if (action === 'opened' && issue != null) {
    // Opened new issue
    const orgs = await axios.get(sender['organizations_url']).then(res => res.data);
    const orgNames = orgs.map(org => org.login);
    const orgIds = orgs.map(org => org.id);

    if (ignoreUsers.has(sender.login)) {
      return { ok: 1 };
    }

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
    }, { headers: { authorization: `Bearer ${slackToken}` } });
  } else if (ref != null && ref_type === 'tag') {
    // Assume tag was created, so create a release
    await createReleaseFromChangelog(ref);
  }

  return { ok: 1 };
});