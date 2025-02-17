'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const mongoose = require('mongoose');

const InviteToWorkspaceParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  githubUsername: {
    $type: 'string',
    $required: true
  },
  email: {
    $type: 'string'
  },
  roles: {
    $type: ['string'],
    $required: true,
    $enum: ['admin', 'member', 'readonly', 'dashboards']
  }
}).compile('InviteToWorkspaceParams');

module.exports = async function inviteToWorkspace(params) {
  const { authorization, githubUsername, email, roles, workspaceId } = new InviteToWorkspaceParams(params);

  const db = await connect();
  const { AccessToken, User, Workspace, Invitation } = db.models;

  // Verify access token
  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid or expired access token'));
  if (accessToken.expiresAt < new Date()) {
    throw new Error('Access token has expired');
  }

  const invitedByUserId = accessToken.userId;

  // Find a workspace where the user is an owner or admin
  const workspace = await Workspace.findById(workspaceId).orFail();
  const inviterRoles = workspace.members.find(member => member.userId.toString() === invitedByUserId.toString())?.roles;
  if (inviterRoles == null || (!inviterRoles.includes('admin') && !inviterRoles.includes('owner'))) {
    throw new Error('Forbidden');
  }
  if (workspace.subscriptionTier !== 'pro') {
    throw new Error('Cannot invite user without creating a subscription');
  }

  const isAlreadyMember = await User.exists(
    { _id: { $in: workspace.members.map(member => member.userId) },
      githubUsername
    });
  if (isAlreadyMember) {
    throw new Error(`${githubUsername} is already a member of this workspace`);
  }

  // Create or update an invitation
  const invitation = await Invitation.findOneAndUpdate(
    { workspaceId: workspace._id, githubUsername },
    { invitedBy: invitedByUserId, roles, email, status: 'pending' },
    { upsert: true, new: true }
  );

  return { invitation };
};
