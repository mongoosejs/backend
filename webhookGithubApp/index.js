'use strict';

const axios = require('axios');
const azureWrapper = require('../util/azureWrapper');
const { createAppAuth } = require('@octokit/auth-token');
const config = require('../.config');
const connect = require('../src/db');

module.exports = azureWrapper(async function webhookGithubApp(context, req) {
  const conn = await connect();

  const Subscriber = conn.model('Subscriber');

  const { installation, sender } = req.body;

  if (installation.account.type !== 'Organization') {
    return { ok: 1, ignored: true };
  }

  const auth = createAppAuth({
    id: config.githubAppId,
    privateKey: config.githubPem,
    installationId: installation.id,
    clientId: config.githubClientId,
    clientSecret: config.githubClientSecret
  });
  const { token } = await auth({ type: 'installation' });
  const githubOrganizationMembers =  await axios.get(`https://api.github.com/orgs/${installation.account.login}/members`, { headers: {
    authorization: `bearer ${token}`
  }}).then((res) => res.data);

  const githubOrganization = installation.account.login;
  const githubOrganizationId = installation.account.id;

  const subscriber = await Subscriber.findOne({ $or: [{ githubOrganization }, { githubOrganizationId }] });
  if (Subscriber == null) {
    return { ok: 1, ignored: true };
  }
  
  subscriber.installationId = installation.id;
  subscriber.githubOrganizationMembers = githubOrganizationMembers;
  await subscriber.save();
  
  return {ok: 1};
});