'use strict';

const Archetype = require('archetype');
const canonicalizeMCPResource = require('../../util/canonicalizeMCPResource');
const connect = require('../../db');
const mcpOAuthError = require('../../util/mcpOAuthError');

const TokenParams = new Archetype({
  grant_type: { $type: 'string', $required: true },
  client_id: { $type: 'string' },
  resource: { $type: 'string' },
  code: { $type: 'string' },
  code_verifier: { $type: 'string' },
  redirect_uri: { $type: 'string' },
  refresh_token: { $type: 'string' }
}).compile('TokenParams');

/**
 * The OAuth token endpoint. MCP clients are public clients, so there is no
 * client authentication here: an authorization code is bound to its client by
 * PKCE and its redirect URI, and a refresh token by the client it was issued to.
 */
module.exports = async function token(params) {
  const { grant_type, client_id, resource, code, code_verifier, redirect_uri, refresh_token } =
    new TokenParams(params);

  const db = await connect();
  const { MCPOAuthAuthorizationCode, MCPOAuthGrant, MCPOAuthToken } = db.models;

  if (grant_type === 'authorization_code') {
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      throw mcpOAuthError('invalid_request', 'code, code_verifier, client_id, and redirect_uri are required');
    }
    const authorizationCode = await MCPOAuthAuthorizationCode.consume({
      code,
      clientId: client_id,
      redirectUri: redirect_uri,
      resource: resource ? canonicalizeMCPResource(resource) : null,
      codeVerifier: code_verifier
    });
    return MCPOAuthToken.issuePair(await activeGrant(MCPOAuthGrant, authorizationCode.grantId));
  }

  if (grant_type === 'refresh_token') {
    if (!refresh_token || !client_id) {
      throw mcpOAuthError('invalid_request', 'refresh_token and client_id are required');
    }
    const token = await MCPOAuthToken.resolveActive(refresh_token, 'refresh');
    if (token.clientId !== client_id) {
      throw mcpOAuthError('invalid_grant', 'Refresh token was issued to a different client');
    }
    if (resource && canonicalizeMCPResource(resource) !== token.resource) {
      throw mcpOAuthError('invalid_target', 'Refresh token resource does not match');
    }
    const grant = await activeGrant(MCPOAuthGrant, token.grantId);

    // Rotate: claim the old refresh token first, so two concurrent refreshes
    // can never both succeed, then issue the replacement pair.
    const rotated = await MCPOAuthToken.findOneAndUpdate(
      { _id: token._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!rotated) {
      throw mcpOAuthError('invalid_grant', 'Refresh token was already used');
    }
    const replacement = await MCPOAuthToken.issuePair(grant);
    await MCPOAuthToken.updateOne(
      { _id: token._id },
      { $set: { replacedByTokenId: MCPOAuthToken.hash(replacement.refresh_token) } }
    );
    return replacement;
  }

  throw mcpOAuthError('unsupported_grant_type', 'Supported grant types are authorization_code and refresh_token');
};

async function activeGrant(MCPOAuthGrant, grantId) {
  const grant = await MCPOAuthGrant.findById(grantId);
  if (!grant || grant.revokedAt) {
    throw mcpOAuthError('invalid_grant', 'Authorization grant is revoked');
  }
  return grant;
}
