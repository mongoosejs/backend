'use strict';

const Archetype = require('archetype');
const canonicalizeMCPResource = require('../../../util/canonicalizeMCPResource');
const connect = require('../../../db');
const mcpAuthorizationRequest = require('../../../util/mcpAuthorizationRequest');
const mcpOAuthError = require('../../../util/mcpOAuthError');

const RegisterMCPResourceParams = new Archetype({
  apiKey: {
    $type: 'string',
    $required: true
  },
  resource: {
    $type: 'string',
    $required: true
  }
}).compile('RegisterMCPResourceParams');

/**
 * A Studio deployment announces the canonical URL it serves MCP requests on, so
 * the authorization server can map an OAuth `resource` back to a workspace.
 */
module.exports = async function registerMCPResource(params) {
  const { apiKey, resource } = new RegisterMCPResourceParams(params);

  const db = await connect();
  const canonicalResource = canonicalizeMCPResource(resource);
  const workspace = await db.models.Workspace.findOneAndUpdate(
    { apiKey },
    { $addToSet: { mcpResources: canonicalResource } },
    { returnDocument: 'after' }
  );
  if (workspace == null) {
    throw mcpOAuthError('invalid_client', 'Invalid Studio API key');
  }

  return { resource: canonicalResource, issuer: mcpAuthorizationRequest.issuer() };
};
