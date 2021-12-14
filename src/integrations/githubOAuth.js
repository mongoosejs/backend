'use strict';

const axios = require('axios');
const config = require('../../.config');
const { createTokenAuth } = require('@octokit/auth-token');

const host = 'https://api.github.com';

module.exports = {
  async createRelease(tagAndName, body) {
    const url = host + '/repos/Automattic/mongoose/releases';
    const data = {
      tag_name: tagAndName,
      name: tagAndName,
      body: body,
    };
    const { token } = await createTokenAuth(config.githubAccessTokenForMongoose)();
    const headers = {
      authorization: `bearer ${token}`,
      accept: 'application/vnd.github.v3+json'
    };
    try {
      await axios.post(url, data, { headers }).then((res) => res.data);
    } catch (err) {
      // GitHub returns a 422 if there's already a release for that tag
      if (err.response.status === 422) {
        return;
      }
      throw err;
    }
  },
  getChangelog() {
    const url = host + '/repos/Automattic/mongoose/contents/CHANGELOG.md';
    const headers = {
      accept: 'application/vnd.github.v3.raw'
    };
    return axios.get(url, { headers }).then((res) => res.data);
  }
};