'use strict';

const Archetype = require('archetype');
const connect = require('../../../db');
const getEffectiveMCPPermissions = require('../../../util/getEffectiveMCPPermissions');
const mcpAuthorizationRequest = require('../../../util/mcpAuthorizationRequest');
const mcpOAuthError = require('../../../util/mcpOAuthError');
const resolveStudioSession = require('../../../util/resolveStudioSession');

const GetMCPAuthorizationRequestParams = new Archetype({
  authorization: { $type: 'string' },
  ...mcpAuthorizationRequest.paths
}).compile('GetMCPAuthorizationRequestParams');

/**
 * Backs the `/mcp-authorize` page: which client is asking, which Studio
 * deployment it wants, and the most access the signed in user may delegate.
 * Works without a Studio session so the page can name the client and workspace
 * while asking the user to sign in.
 */
module.exports = async function getMCPAuthorizationRequest(params) {
  const { authorization, ...oauthParams } = new GetMCPAuthorizationRequestParams(params);

  const db = await connect();
  const request = await mcpAuthorizationRequest.validate(db, oauthParams);
  const workspace = await db.models.Workspace.findByMCPResource(request.resource);

  const context = {
    client: { id: request.client._id, name: request.client.clientName, uri: request.client.clientUri || null },
    resource: request.resource,
    workspace: { _id: workspace._id, name: workspace.name },
    user: null,
    maximum: null
  };

  const session = await resolveStudioSession(db, authorization, { required: false });
  if (session == null) {
    return context;
  }

  const member = workspace.memberFor(session.user._id);
  if (member == null) {
    throw mcpOAuthError('access_denied', 'Your account is not a member of this Mongoose Studio workspace');
  }
  const maximum = getEffectiveMCPPermissions.getMaximumMCPPermissions({ workspace, member });
  if (!maximum.read) {
    throw mcpOAuthError('access_denied', 'Your account does not have database read access in this workspace');
  }

  context.user = { _id: session.user._id, name: session.user.name, email: session.user.email };
  context.roles = member.roles;
  context.maximum = maximum;
  return context;
};
