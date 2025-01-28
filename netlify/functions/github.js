'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const githubOAuth = require('../../src/integrations/githubOAuth');

const userInfoURL = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';

const GithubOAuthParams = new Archetype({
  code: {
    $type: 'string'
  }
}).compile('GithubOAuthParams');

module.exports = extrovert.toNetlifyFunction(async function github(params) {
  params = new GithubOAuthParams(params);
  const code = params.code;

  const db = await connect();
  const { AccessToken, User } = db.models;

  const { access_token: token } = await githubOAuth.getAccessToken(code);
  const userData = await githubOAuth.getUser(token);

  const { id: githubUserId, notification_email: email, avatar_url: picture, name, login: githubUsername } = userData;

  const $set = {
    githubUserId
  };
  const $setOnInsert = {
    email,
    picture,
    name,
    githubUsername
  };

  const user = await User.findOneAndUpdate(
    { $or: [{ githubUserId }, { email }] },
    {
      $set,
      $setOnInsert
    },
    { upsert: true, returnDocument: 'after' }
  );

  const accessToken = await AccessToken.create({
    userId: user._id
  });

  return { user, accessToken };
});
