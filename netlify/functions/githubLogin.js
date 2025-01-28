'use strict';

const Archetype = require('archetype');
const extrovert = require('extrovert');

const GithubLoginParams = new Archetype({
  state: {
    $type: 'string'
  }
}).compile('GithubLoginParams');

module.exports = extrovert.toNetlifyFunction(async function githubLogin(params) {
  const { state } = new GithubLoginParams(params);

  const query = new URLSearchParams();
  query.set('client_id', process.env.GITHUB_CLIENT_ID);
  query.set('redirect_uri', process.env.GITHUB_REDIRECT_URI);
  query.set('scope', 'read:user user:email');
  query.set('allow_signup', true);
  query.set('state', state);
  const url = `https://github.com/login/oauth/authorize?${query}`;
  return { url };
});
