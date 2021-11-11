'use strict';

const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');
const githubApp = require('../src/integrations/githubApp');

module.exports = azureWrapper(webhookGithubApp);
module.exports.rawFunction = webhookGithubApp;

async function webhookGithubApp(context, req) {
  const conn = await connect();

  const Subscriber = conn.model('Subscriber');

  const { installation, sender } = req.body;

  if (installation.account.type !== 'Organization') {
    return { ok: 1, ignored: true };
  }

  const githubOrganizationMembers = await githubApp.getOrganizationMembers(installation.id, installation.account.login);

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
}