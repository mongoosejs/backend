'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const GetMyAccountParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  }
}).compile('GetMyAccountParams');

module.exports = async function getMyAccount(params) {
  const { authorization } = new GetMyAccountParams(params);

  const db = await connect();
  const { AccessToken, User, Workspace } = db.models;

  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid or expired access token'));
  if (accessToken.expiresAt < new Date()) {
    throw new Error('Access token has expired');
  }

  const user = await User.findById(accessToken.userId).orFail(new Error('User not found'));
  const workspaces = await Workspace.find({ 'members.userId': user._id }).sort({ name: 1, createdAt: 1 });

  const workspaceSummaries = workspaces.map(workspace => {
    const member = workspace.members.find(member => member.userId.toString() === user._id.toString());
    return {
      _id: workspace._id,
      name: workspace.name,
      apiKey: workspace.apiKey,
      subscriptionTier: workspace.subscriptionTier,
      stripeCustomerId: workspace.stripeCustomerId,
      stripeSubscriptionId: workspace.stripeSubscriptionId,
      roles: member?.roles ?? []
    };
  });

  return { user, workspaces: workspaceSummaries };
};
