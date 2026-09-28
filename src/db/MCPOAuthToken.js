'use strict';

const crypto = require('crypto');
const mcpOAuthError = require('../util/mcpOAuthError');
const mongoose = require('mongoose');

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Tokens are stored as SHA-256 hashes of the value the client holds, so a dump
// of this collection cannot be replayed against Studio. A token is an opaque
// reference to a grant: none of the delegated policy is embedded in it.
const mcpOAuthTokenSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  type: { type: String, required: true, enum: ['access', 'refresh'] },
  grantId: { type: mongoose.ObjectId, required: true, ref: 'MCPOAuthGrant', index: true },
  clientId: { type: String, required: true },
  resource: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date },
  replacedByTokenId: { type: String }
}, {
  timestamps: true,
  id: false,
  statics: {
    hash(token) {
      return crypto.createHash('sha256').update(`${token}`).digest('hex');
    },

    /**
     * Issue an access token and a refresh token for a grant, and return them in
     * the shape RFC 6749 expects from the token endpoint. Access tokens are
     * deliberately short-lived: they are only a cached pointer to a grant that
     * the user can revoke or edit at any time.
     */
    async issuePair(grant) {
      const accessToken = randomToken('mcp_at_');
      const refreshToken = randomToken('mcp_rt_');
      await this.create([
        {
          _id: this.hash(accessToken),
          type: 'access',
          grantId: grant._id,
          clientId: grant.oauthClientId,
          resource: grant.resource,
          expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS)
        },
        {
          _id: this.hash(refreshToken),
          type: 'refresh',
          grantId: grant._id,
          clientId: grant.oauthClientId,
          resource: grant.resource,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
        }
      ]);

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
        refresh_token: refreshToken,
        scope: 'mcp',
        resource: grant.resource
      };
    },

    /** Look up a token that is the right type and is neither expired nor revoked. */
    async resolveActive(rawToken, type) {
      const token = await this.findById(this.hash(rawToken));
      if (!token || token.type !== type || token.revokedAt || token.expiresAt <= new Date()) {
        throw mcpOAuthError(
          type === 'access' ? 'invalid_token' : 'invalid_grant',
          `${type === 'access' ? 'Access' : 'Refresh'} token is invalid, expired, or revoked`
        );
      }
      return token;
    }
  }
});

module.exports = mcpOAuthTokenSchema;

function randomToken(prefix) {
  return prefix + crypto.randomBytes(32).toString('base64url');
}
