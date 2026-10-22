'use strict';

const axios = require('axios');
const { createTokenAuth } = require('@octokit/auth-token');

const githubOAuthClientId = process.env.GITHUB_CLIENT_ID;
const githubOAuthClientSecret = process.env.GITHUB_CLIENT_SECRET;

module.exports = {
  async getUserFromToken(githubAccessToken) {
    const { token } = await createTokenAuth(githubAccessToken)();
    const headers = {
      authorization: `bearer ${token}`,
      accept: 'application/vnd.github.v3+json'
    };
    return axios.get('https://api.github.com/user', { headers }).then(res => res.data);
  },
  async getUser(token) {
    const headers = {
      authorization: `token ${token}`,
      accept: 'application/vnd.github.v3+json'
    };
    const response = await fetch('https://api.github.com/user', { headers });
    const body = await response.json();
    if (response.status >= 400) {
      throw new Error(`Request failed with status ${response.status}: ${require('util').inspect(body)}`);
    }
    return body;
  },
  async getPrimaryEmail(token) {
    const headers = {
      authorization: `token ${token}`,
      accept: 'application/vnd.github.v3+json'
    };
    const response = await fetch('https://api.github.com/user/emails', { headers });
    const body = await response.json();
    if (response.status >= 400) {
      throw new Error(`Request failed with status ${response.status}: ${require('util').inspect(body)}`);
    }
    if (!Array.isArray(body)) {
      return null;
    }
    const primary = body.find(email => email.primary && email.verified) || body.find(email => email.primary) || body[0];
    return primary?.email || null;
  },
  getAccessToken(code) {
    const body = {
      client_id: githubOAuthClientId,
      client_secret: githubOAuthClientSecret,
      code
    };
    const opts = { headers: { accept: 'application/json' } };
    return axios.post('https://github.com/login/oauth/access_token', body, opts).
      then(res => res.data);
  }
};
