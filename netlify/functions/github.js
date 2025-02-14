'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const githubOAuth = require('../../src/integrations/githubOAuth');
const mongoose = require('mongoose');
const stripe = require('../../src/integrations/stripe');

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
  const { AccessToken, Invitation, User, Workspace } = db.models;

  const workspace = await Workspace.findById(workspaceId).orFail();

  const { access_token: token } = await githubOAuth.getAccessToken(code);
  const userData = await githubOAuth.getUser(token);

  const { id: githubUserId, notification_email: email, avatar_url: picture, name, login: githubUsername } = userData;

  const $set = {
    githubUserId,
    email,
    picture,
    name
  };

  const user = await User.findOneAndUpdate(
    { githubUsername },
    {
      $set
    },
    { upsert: true, returnDocument: 'after' }
  );

  const accessToken = await AccessToken.create({
    userId: user._id
  });

  const member = workspace.members.find(member => member.userId.toString() === user._id.toString());
  let roles = null;
  if (member == null) {
    const invitation = await Invitation.findOne({
      githubUsername,
      workspaceId,
      status: 'pending'
    });
    if (invitation != null) {
      workspace.members.push({ userId: user._id, roles: invitation.roles });
      await workspace.save();

      invitation.status = 'accepted';
      await invitation.save();

      roles = invitation.roles;

      if (workspace.stripeSubscriptionId && !user.isFreeUser) {
        const users = await User.find({ _id: { $in: workspace.members.map(member => member.userId) }, isFreeUser: { $ne: true } });
        const seats = users.length;
        await stripe.updateSubscriptionSeats(workspace.stripeSubscriptionId, seats);
      }
    }
  } else {
    roles = member.roles;
  }

  return { user, accessToken, roles };
});
