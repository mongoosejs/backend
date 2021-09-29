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
    const res = await axios.post(`${issue.url}/labels`, { labels: ['priority'] }, {
      headers: {
        authorization: `bearer ${token}`
      }
    }).then(res => res.data);
    console.log(res.data);
  }

  return { ok: 1 };
});