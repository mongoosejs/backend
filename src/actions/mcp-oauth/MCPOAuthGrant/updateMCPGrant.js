'use strict';

const Archetype = require('archetype');
const connect = require('../../../db');
const mongoose = require('mongoose');
const resolveStudioSession = require('../../../util/resolveStudioSession');

const UpdateMCPGrantParams = new Archetype({
  authorization: { $type: 'string' },
  grantId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  capabilities: {
    read: { $type: 'boolean' },
    write: { $type: 'boolean' },
    readPreference: { $type: 'string', $enum: ['secondary', 'secondaryPreferred', 'primary'] },
    maxTimeMS: { $type: 'number' }
  }
}).compile('UpdateMCPGrantParams');

/**
 * Change what an already connected MCP client may do. The client keeps its
 * refresh token: because an access token is only a reference to this grant, the
 * new policy applies to the client's next MCP request.
 */
module.exports = async function updateMCPGrant(params) {
  const { authorization, grantId, capabilities } = new UpdateMCPGrantParams(params);

  const db = await connect();
  const { MCPOAuthGrant, Workspace } = db.models;

  const { user } = await resolveStudioSession(db, authorization, { required: true });
  const grant = await MCPOAuthGrant.findOne({ _id: grantId, userId: user._id, revokedAt: null });
  if (grant == null) {
    throw new Error('MCP authorization grant not found');
  }

  const workspace = await Workspace.findById(grant.workspaceId).orFail();
  const member = workspace.memberFor(user._id);
  if (member == null) {
    throw new Error('You are no longer a member of this workspace');
  }

  const capabilitiesToStore = MCPOAuthGrant.toCapabilities({ workspace, member, requested: capabilities });
  if (!capabilitiesToStore.read) {
    throw new Error('A grant must include database read access. Revoke the grant instead.');
  }

  grant.capabilities = capabilitiesToStore;
  await grant.save();

  return { grant };
};
