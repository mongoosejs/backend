'use strict';

const Archetype = require('archetype');
const connect = require('../../../db');
const getEffectiveMCPPermissions = require('../../../util/getEffectiveMCPPermissions');
const resolveStudioSession = require('../../../util/resolveStudioSession');

const ListMCPGrantsParams = new Archetype({
  authorization: { $type: 'string' }
}).compile('ListMCPGrantsParams');

/**
 * The MCP clients this user has connected. Each grant carries the workspace it
 * belongs to and the ceiling it can be edited within, so the account page can
 * offer only changes that are valid reductions of the user's own access.
 */
module.exports = async function listMCPGrants(params) {
  const { authorization } = new ListMCPGrantsParams(params);

  const db = await connect();
  const { MCPOAuthGrant, Workspace } = db.models;

  const { user } = await resolveStudioSession(db, authorization, { required: true });
  const grants = await MCPOAuthGrant.find({ userId: user._id }).sort({ updatedAt: -1 });
  const workspaces = await Workspace.
    find({ _id: { $in: grants.map(grant => grant.workspaceId) } }).
    select({ name: 1, members: 1, mcpPolicy: 1 });

  return {
    grants: grants.map(grant => {
      const workspace = workspaces.find(current => current._id.toString() === grant.workspaceId.toString());
      const member = workspace?.memberFor(grant.userId);
      return {
        ...grant.toObject(),
        workspaceName: workspace?.name ?? null,
        effective: getEffectiveMCPPermissions({ workspace, member, grant }),
        maximum: getEffectiveMCPPermissions.getMaximumMCPPermissions({ workspace, member })
      };
    })
  };
};
