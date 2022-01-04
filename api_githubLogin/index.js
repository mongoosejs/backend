'use strict'

const Archetype = require('archetype');
const axios = require('axios');
const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');
const githubOAuth = require('../src/integrations/githubOAuth');

const { githubOAuthClientId, githubOAuthClientSecret } = require('../.config');

const GithubLoginParams = new Archetype({
  code: {
    $type: 'string',
    $required: true
  }
}).compile('GithubLoginParams');

module.exports = azureWrapper(githubLogin);
module.exports.rawFunction = githubLogin;

async function githubLogin(context, req) {
  const conn = await connect();
  const AccessToken = conn.model('AccessToken');
  const Subscriber = conn.model('Subscriber');
  const Task = conn.model('Task');

  const task = await Task.create({
    method: req.method,
    url: req.url,
    params: req.body
  });

  const { code } = new GithubLoginParams(req.query);

  const data = await task.sideEffect(githubOAuth.getAccessToken, code);

  if (data.error != null) {
    throw new Error('Login failed: ' + data['error_description']);
  }
  if (data['access_token'] == null) {
    throw new Error('No access token!');
  }

  const githubAccessToken = data['access_token'];
  const { login, id } = await task.sideEffect(githubOAuth.getUserFromToken, githubAccessToken);

  const token = await AccessToken.create({
    githubAccessToken,
    githubUserId: id,
    githubUserName: login
  });

  return { ok: 1, token: token._id };
}