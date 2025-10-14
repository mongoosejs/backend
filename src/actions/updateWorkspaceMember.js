'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const mongoose = require('mongoose');
const stripe = require('../integrations/stripe');

const UpdateWorkspaceMemberParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  userId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  roles: {
    $type: ['string'],
    $required: true,
    $enum: ['admin', 'member', 'readonly', 'dashboards']
  }
}).compile('UpdateWorkspaceMemberParams');

module.exports = async function updateWorkspaceMember(params) {
  const db = await connect();
  const { AccessToken, User, Workspace } = db.models;

  const { authorization, workspaceId, userId, roles } = new UpdateWorkspaceMemberParams(params);

  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid or expired access token'));
  if (accessToken.expiresAt < new Date()) {
    throw new Error('Access token has expired');
  }
  const initiatedByUserId = accessToken.userId;

  const workspace = await Workspace.findById(workspaceId).orFail(new Error('Workspace not found'));
  const initiatedByUserRoles = workspace.members.find(member => member.userId.toString() === initiatedByUserId.toString())?.roles;
  if (initiatedByUserRoles == null || (!initiatedByUserRoles.includes('admin') && !initiatedByUserRoles.includes('owner'))) {
    throw new Error('Forbidden');
  }

  const member = workspace.members.find(currentMember => currentMember.userId.toString() === userId.toString());
  if (member == null) {
    throw new Error('Member not found in the workspace');
  }

  member.roles = roles;
  await workspace.save();

  const users = await User.find({ _id: { $in: workspace.members.map(currentMember => currentMember.userId) } });
  if (workspace.stripeSubscriptionId) {
    const seats = users.filter(user => !user.isFreeUser).length;
    await stripe.updateSubscriptionSeats(workspace.stripeSubscriptionId, seats);
  }

  return { workspace, users };
};
