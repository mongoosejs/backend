'use strict';

const OAUTH_ERROR_STATUS = {
  invalid_client: 401,
  invalid_token: 401,
  login_required: 401,
  insufficient_scope: 403,
  server_error: 500
};

/**
 * An OAuth error as defined by RFC 6749: MCP clients read `error` to decide what
 * to do next, so it has to survive all the way out to the HTTP response.
 */
module.exports = function mcpOAuthError(code, message) {
  const error = new Error(message);
  error.oauthCode = code;
  error.status = OAUTH_ERROR_STATUS[code] || 400;
  return error;
};
