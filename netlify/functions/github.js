'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const githubOAuth = require('../../src/integrations/githubOAuth');
const mongoose = require('mongoose');

const GithubOAuthParams = new Archetype({
  code: {
    $type: 'string',
    $required: true
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId
  }
}).compile('GithubOAuthParams');

module.exports = extrovert.toNetlifyFunction(async function github(params) {
  params = new GithubOAuthParams(params);
  const code = params.code;
  const workspaceId = params.workspaceId;

  const db = await connect();
  const { AccessToken, User, Workspace } = db.models;

  const workspace = await Workspace.findById(workspaceId).orFail();

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

  const roles = workspace.members.find(member => member.userId.toString() === user._id.toString())?.roles ?? null;

  return { user, accessToken, roles };
});
