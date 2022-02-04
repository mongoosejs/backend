'use strict';

const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');
const githubApp = require('../src/integrations/githubApp');
const updateGithubOrganizationMembers = require('../src/actions/updateGithubOrganizationMembers');

module.exports = azureWrapper(webhookGithubApp);
module.exports.rawFunction = webhookGithubApp;

async function webhookGithubApp(context, req) {
  const conn = await connect();

  const Subscriber = conn.model('Subscriber');
  const Task = conn.model('Task');

  const { installation, sender } = req.body;
  const task = await Task.create({
    method: req.method,
    url: req.url,
    params: req.body
  });

  if (installation.account.type !== 'Organization') {
    await task.log(`Skipping because account type is "${installation.account.type}`);
    return { ok: 1, ignored: true };
  }

  const githubOrganization = installation.account.login;
  const githubOrganizationId = installation.account.id;

  const subscriber = await Subscriber.findOne({ $or: [{ githubOrganization }, { githubOrganizationId }] });
  if (Subscriber == null) {
    await task.log(`No subscriber found for "${githubOrganization}" "${githubOrganizationId}"`);
    return { ok: 1, ignored: true };
  }
  
  subscriber.installationId = installation.id;
  await subscriber.save();

  await updateGithubOrganizationMembers({ task, conn })({
    _id: subscriber._id
  });
  
  await task.log('Success');

  return { ok: 1 };
}