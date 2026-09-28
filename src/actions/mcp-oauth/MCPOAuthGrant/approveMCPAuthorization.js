'use strict';

const Archetype = require('archetype');
const connect = require('../../../db');
const mcpAuthorizationRequest = require('../../../util/mcpAuthorizationRequest');
const mcpOAuthError = require('../../../util/mcpOAuthError');
const resolveStudioSession = require('../../../util/resolveStudioSession');

const ApproveMCPAuthorizationParams = new Archetype({
  // Not required here: a missing or expired session is an authentication
  // failure, which should read as a 401 rather than a validation error.
  authorization: { $type: 'string' },
  capabilities: {
    read: { $type: 'boolean' },
    write: { $type: 'boolean' },
    readPreference: { $type: 'string', $enum: ['secondary', 'secondaryPreferred', 'primary'] },
    maxTimeMS: { $type: 'number' }
  },
  ...mcpAuthorizationRequest.paths
}).compile('ApproveMCPAuthorizationParams');

/**
 * The user authorized the request. Persist what they delegated as a grant, then
 * hand back the redirect that sends the MCP client home with a single use
 * authorization code.
 */
module.exports = async function approveMCPAuthorization(params) {
  const { authorization, capabilities, ...oauthParams } = new ApproveMCPAuthorizationParams(params);

  const db = await connect();
  const { MCPOAuthAuthorizationCode, MCPOAuthGrant, Workspace } = db.models;

  const request = await mcpAuthorizationRequest.validate(db, oauthParams);
  const workspace = await Workspace.findByMCPResource(request.resource);
  const { user } = await resolveStudioSession(db, authorization, { required: true });

  const member = workspace.memberFor(user._id);
  if (member == null) {
    throw mcpOAuthError('access_denied', 'Your account is not a member of this Mongoose Studio workspace');
  }

  const grantedCapabilities = MCPOAuthGrant.toCapabilities({ workspace, member, requested: capabilities });
  if (!grantedCapabilities.read) {
    throw mcpOAuthError('access_denied', 'The requested access has no database read access');
  }

  const grant = await MCPOAuthGrant.create({
    userId: user._id,
    workspaceId: workspace._id,
    resource: request.resource,
    oauthClientId: request.client._id,
    oauthClientName: request.client.clientName,
    capabilities: grantedCapabilities
  });
  const code = await MCPOAuthAuthorizationCode.issue({ grant, request });

  return {
    redirect: mcpAuthorizationRequest.buildRedirect(request, { code }),
    grant
  };
};
