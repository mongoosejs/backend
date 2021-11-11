'use strict';

const axios = require('axios');
const config = require('../../.config');
const { createAppAuth } = require('@octokit/auth-app');

const host = 'https://api.github.com';

const { githubAppId, githubPem, githubClientId, githubClientSecret } = config;

module.exports = {
  async getOrganizationMembers(installationId, orgName) {
    const auth = createAppAuth({
      id: githubAppId,
      privateKey: githubPem,
      installationId: installationId,
      clientId: githubClientId,
      clientSecret: githubClientSecret
    });
    const { token } = await auth({ type: 'installation' });
    const members = await axios.get(
      `${host}/orgs/${orgName}/members`,
      { headers: { authorization: `bearer ${token}` } }
    ).then((res) => res.data);
    return members;
  }
};