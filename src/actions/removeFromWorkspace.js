'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const mongoose = require('mongoose');

const RemoveFromWorkspaceParams = new Archetype({
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
  }
}).compile('InviteToWorkspaceParams');

module.exports = async function removeFromWorkspace(params) {
  const db = await connect();
  const { AccessToken, Workspace } = db.models;

  const { authorization, workspaceId, userId } = new RemoveFromWorkspaceParams(params);

  // Verify access token
  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid or expired access token'));
  if (accessToken.expiresAt < new Date()) {
    throw new Error('Access token has expired');
  }
  const initiatedByUserId = accessToken._id;

  const workspace = await Workspace.findById(workspaceId).orFail(new Error('Workspace not found'));
  const initiatedByUserRoles = workspace.members.find(member => member.userId.toString() === initiatedByUserId.toString())?.roles;
  if (initiatedByUserRoles == null || (!initiatedByUserRoles.includes('admin') && !initiatedByUserRoles.includes('owner'))) {
    throw new Error('Forbidden');
  }

  const memberIndex = workspace.members.findIndex(member => member.userId.toString() === userId.toString());
  if (memberIndex === -1) {
    throw new Error('Member not found in the workspace');
  }

  workspace.members.splice(memberIndex, 1);
  await workspace.save();

  return { workspace };
};
