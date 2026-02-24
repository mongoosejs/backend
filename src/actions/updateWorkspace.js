'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const mongoose = require('mongoose');

const UpdateWorkspaceParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  name: {
    $type: 'string'
  }
}).compile('UpdateWorkspaceParams');

module.exports = async function updateWorkspace(params) {
  const { authorization, workspaceId, name } = new UpdateWorkspaceParams(params);

  const db = await connect();
  const { AccessToken, Workspace } = db.models;

  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid or expired access token'));
  if (accessToken.expiresAt < new Date()) {
    throw new Error('Access token has expired');
  }

  const workspace = await Workspace.findById(workspaceId).orFail(new Error('Workspace not found'));
  const roles = workspace.members.find(member => member.userId.toString() === accessToken.userId.toString())?.roles || [];
  if (!roles.includes('owner') && !roles.includes('admin')) {
    throw new Error('Forbidden');
  }

  if (name != null) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Workspace name is required');
    }
    if (trimmed.length > 120) {
      throw new Error('Workspace name is too long');
    }
    workspace.name = trimmed;
  }

  await workspace.save();

  return { workspace };
};
