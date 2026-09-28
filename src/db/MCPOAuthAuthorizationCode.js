'use strict';

const crypto = require('crypto');
const mcpOAuthError = require('../util/mcpOAuthError');
const mongoose = require('mongoose');

const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;

// Authorization codes are single use and short-lived, stored by hash, and bound
// to the PKCE challenge the client sent with its authorization request.
const mcpOAuthAuthorizationCodeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  grantId: { type: mongoose.ObjectId, required: true, ref: 'MCPOAuthGrant' },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  resource: { type: String, required: true },
  codeChallenge: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date }
}, {
  timestamps: true,
  id: false,
  statics: {
    hash(code) {
      return crypto.createHash('sha256').update(`${code}`).digest('hex');
    },

    /** Mint a code for a grant, and return the value to hand the client. */
    async issue({ grant, request }) {
      const code = 'mcp_code_' + crypto.randomBytes(32).toString('base64url');
      await this.create({
        _id: this.hash(code),
        grantId: grant._id,
        clientId: request.client._id,
        redirectUri: request.redirectUri,
        resource: request.resource,
        codeChallenge: request.codeChallenge,
        expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS)
      });
      return code;
    },

    /**
     * Verify a code against the client, redirect URI, resource, and PKCE
     * verifier that come with the token request, then consume it. The consuming
     * update is conditional on `usedAt`, so two racing requests cannot both
     * redeem the same code.
     */
    async consume({ code, clientId, redirectUri, resource, codeVerifier }) {
      const codeId = this.hash(code);
      const authorizationCode = await this.findById(codeId);
      if (!authorizationCode || authorizationCode.usedAt || authorizationCode.expiresAt <= new Date()) {
        throw mcpOAuthError('invalid_grant', 'Authorization code is invalid, expired, or already used');
      }
      if (authorizationCode.clientId !== clientId || authorizationCode.redirectUri !== redirectUri) {
        throw mcpOAuthError('invalid_grant', 'Authorization code client or redirect URI does not match');
      }
      if (resource && resource !== authorizationCode.resource) {
        throw mcpOAuthError('invalid_target', 'Authorization code resource does not match');
      }
      if (!verifyCodeChallenge(codeVerifier, authorizationCode.codeChallenge)) {
        throw mcpOAuthError('invalid_grant', 'PKCE verification failed');
      }

      const consumed = await this.findOneAndUpdate(
        { _id: codeId, usedAt: null },
        { $set: { usedAt: new Date() } },
        { returnDocument: 'after' }
      );
      if (!consumed) {
        throw mcpOAuthError('invalid_grant', 'Authorization code was already used');
      }
      return consumed;
    }
  }
});

module.exports = mcpOAuthAuthorizationCodeSchema;

function verifyCodeChallenge(verifier, expectedChallenge) {
  const challenge = crypto.createHash('sha256').update(`${verifier}`).digest('base64url');
  const left = Buffer.from(challenge);
  const right = Buffer.from(`${expectedChallenge}`);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
