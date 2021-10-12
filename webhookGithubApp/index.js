'use strict';

const axios = require('axios');
const azureWrapper = require('../util/azureWrapper');
const { createAppAuth } = require('@octokit/auth-token');
const config = require('../.config/.config.js');
const mongoose = require('mongoose');

let conn = null;
const subscriberSchema = new mongoose.Schema({
  githubOrgMembers: [],
  githubOrganization: { type: String },
  githubOrganizationId: { type: String }
});

module.exports = azureWrapper(async function webhookGithubApp(context, req) {
  let Subscriber;
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }

  Subscriber = conn.model('Subscriber', subscriberSchema, 'Subscriber');

  const { installation, sender } = req.body;

  if(installation.account.type !== 'Organization') { return ;}

  const auth = createAppAuth({
    id: config.githubAppId,
    privateKey: config.githubPem,
    installationId: installation.id,
    clientId: config.githubClientId,
    clientSecret: config.githubClientSecret
  });
  const { token } = await auth({ type: 'installation' });
  const membersList =  await axios.get(`https://api.github.com/orgs/${installation.account.login}/members`, { headers: {
    authorization: `bearer ${token}`
  }}).then((res) => res.data);

  const memberOrg = installation.account.login;
  const orgId = installation.account.id;
  await Subscriber.create({githubOrganization: memberOrg, githubOrganizationId: orgId, githubOrgMembers: membersList});
  return {ok: 1};
});