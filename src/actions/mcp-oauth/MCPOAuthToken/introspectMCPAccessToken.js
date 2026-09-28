'use strict';

const Archetype = require('archetype');
const canonicalizeMCPResource = require('../../../util/canonicalizeMCPResource');
const connect = require('../../../db');
const getEffectiveMCPPermissions = require('../../../util/getEffectiveMCPPermissions');
const mcpOAuthError = require('../../../util/mcpOAuthError');

const IntrospectMCPAccessTokenParams = new Archetype({
  apiKey: {
    $type: 'string',
    $required: true
  },
  token: {
    $type: 'string',
    $required: true
  },
  resource: {
    $type: 'string',
    $required: true
  }
}).compile('IntrospectMCPAccessTokenParams');

/**
 * Called by a Studio deployment on every MCP request. Resolves an access token
 * to its grant and recomputes the effective authorization from scratch, so a
 * revoked or edited grant, or a change to the user's roles, takes effect without
 * waiting for the access token to expire.
 */
module.exports = async function introspectMCPAccessToken(params) {
  const { apiKey, token, resource } = new IntrospectMCPAccessTokenParams(params);

  const db = await connect();
  const { MCPOAuthGrant, MCPOAuthToken, User, Workspace } = db.models;

  const workspace = await Workspace.findOne({ apiKey });
  if (!workspace) {
    throw mcpOAuthError('invalid_client', 'Invalid Studio API key');
  }

  const canonicalResource = canonicalizeMCPResource(resource);
  const accessToken = await MCPOAuthToken.resolveActive(token, 'access');
  if (accessToken.resource !== canonicalResource) {
    throw mcpOAuthError('invalid_token', 'Access token audience does not match this MCP resource');
  }

  const grant = await MCPOAuthGrant.findById(accessToken.grantId);
  if (!grant || grant.revokedAt || grant.resource !== canonicalResource) {
    throw mcpOAuthError('invalid_token', 'Authorization grant is revoked');
  }
  if (grant.workspaceId.toString() !== workspace._id.toString()) {
    throw mcpOAuthError('invalid_token', 'Authorization grant belongs to another workspace');
  }

  const user = await User.findById(grant.userId);
  const member = workspace.memberFor(grant.userId);
  if (!user || !member) {
    throw mcpOAuthError('invalid_token', 'User no longer has access to this workspace');
  }

  const permissions = getEffectiveMCPPermissions({ workspace, member, grant });
  if (!permissions.read) {
    throw mcpOAuthError('insufficient_scope', 'The current effective policy does not permit MCP access');
  }

  await MCPOAuthGrant.updateOne({ _id: grant._id }, { $set: { lastUsedAt: new Date() } });

  return {
    active: true,
    user,
    workspaceId: workspace._id,
    grantId: grant._id,
    clientId: grant.oauthClientId,
    clientName: grant.oauthClientName,
    permissions
  };
};
