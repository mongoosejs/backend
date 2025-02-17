'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const mongoose = require('mongoose');
const stripe = require('../integrations/stripe');

const GetInvitationsForWorkspaceParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('GetInvitationsParams');

module.exports = async function getWorkspaceTeam(params) {
  const { authorization, workspaceId } = new GetInvitationsForWorkspaceParams(params);

  const db = await connect();
  const { AccessToken, Invitation, User, Workspace } = db.models;

  // Find the user linked to the access token
  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid access token'));
  const userId = accessToken.userId;

  // Find the workspace and check user permissions
  const workspace = await Workspace.findById(workspaceId).orFail(new Error('Workspace not found'));

  const isAuthorized = workspace.members.some(member =>
    member.userId.toString() === userId.toString() && member.roles.find(role => role === 'admin' || role === 'owner')
  );

  if (!isAuthorized) {
    throw new Error('User is not authorized to view workspace team');
  }

  const url = await stripe.createCustomerPortalLink(workspace.stripeCustomerId);

  return { url };
};
