'use strict';

const Archetype = require('archetype');
const connect = require('../../db');
const mcpOAuthError = require('../../util/mcpOAuthError');

const RevokeParams = new Archetype({
  token: {
    $type: 'string',
    $required: true
  },
  token_type_hint: { $type: 'string' }
}).compile('RevokeParams');

/**
 * RFC 7009 token revocation. MCP clients revoke the refresh token when a user
 * disconnects, which revokes the whole grant: an access token must never outlive
 * a disconnect by more than its own short lifetime. Revoking an access token on
 * its own only revokes that token, so a client can drop one token without
 * disconnecting.
 *
 * Revocation answers 200 for unknown tokens, so this endpoint cannot be used to
 * probe which tokens exist.
 */
module.exports = async function revoke(params) {
  const { token } = new RevokeParams(params);
  if (!token) {
    throw mcpOAuthError('invalid_request', 'token is required');
  }

  const db = await connect();
  const { MCPOAuthGrant, MCPOAuthToken } = db.models;

  const tokenDoc = await MCPOAuthToken.findById(MCPOAuthToken.hash(token));
  if (tokenDoc == null) {
    return {};
  }
  if (tokenDoc.type === 'refresh') {
    await MCPOAuthGrant.revokeById(tokenDoc.grantId);
    return {};
  }
  await MCPOAuthToken.updateOne({ _id: tokenDoc._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

  return {};
};
