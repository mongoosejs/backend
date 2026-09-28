'use strict';

const mcpOAuthError = require('./mcpOAuthError');

/**
 * Resolve the Mongoose Studio user behind an `Authorization` header. The MCP
 * authorization page and the account page both act as the signed in user, and
 * both need a missing or expired session to read as a 401 rather than a crash.
 */
module.exports = async function resolveStudioSession(db, authorization, { required }) {
  const token = `${authorization || ''}`.replace(/^Bearer\s+/i, '').trim();
  const accessToken = token ? await db.models.AccessToken.findById(token) : null;
  const user = accessToken != null && accessToken.expiresAt > new Date() ?
    await db.models.User.findById(accessToken.userId) :
    null;

  if (user == null) {
    if (required) {
      throw mcpOAuthError('login_required', 'Mongoose Studio sign-in is required');
    }
    return null;
  }
  return { accessToken, user };
};
