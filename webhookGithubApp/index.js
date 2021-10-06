'use strict';

const axios = require('axios');
const azureWrapper = require('../util/azureWrapper');
const { createAppAuth } = require('@octokit/auth-token');
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

module.exports = azureWrapper(async function webhookGithubApp(context, req) {
  let Subscriber;
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }

  Subscriber = conn.model('Subscriber', subscriberSchema, 'Subscriber');

  const { installation, sender } = req.body;
  const auth = createAppAuth({
    id: ,
    privateKey: ,
    installationId: installation.id,
    clientId: ,
    clientSecret: 
  });
  const { token } = await auth({ type: 'installation' });

  if(installation.account.type == 'Organization') {
    const membersList =  await axios.get(`https://api.github.com/orgs/${installation.account.login}/members`, { headers: {
      authorization: `bearer ${token}`
    }}).then((res) => res.data);
    const memberOrg = installation.account.login;
    const orgId = installation.account.id;
    for (let i = 0; i < membersList.length; i++) {
      let userInfo = await axios.get(`https://api.github.com/users/${membersList[i].login}`);

      if(await Subscriber.find({email: userInfo.email})) continue;

      await Subscriber.create({
        email: userInfo.email,
        githubUsername: membersList[i].login,
        githubUserId: membersList[i].id,
        githubOrganization: memberOrg,
        githubOrganizationId: orgId
      });
    }
  }
  return {ok: 1};
});