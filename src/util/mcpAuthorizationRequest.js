'use strict';

const canonicalizeMCPResource = require('./canonicalizeMCPResource');
const mcpOAuthError = require('./mcpOAuthError');

const SCOPE = 'mcp';

exports.SCOPE = SCOPE;

/**
 * The OAuth authorization request parameters that the `/mcp-authorize` page
 * round trips. They keep their OAuth spelling so the page can forward its own
 * query string without renaming anything.
 */
exports.paths = {
  response_type: {
    $type: 'string',
    $required: true
  },
  client_id: {
    $type: 'string',
    $required: true
  },
  redirect_uri: {
    $type: 'string',
    $required: true
  },
  resource: {
    $type: 'string',
    $required: true
  },
  scope: {
    $type: 'string'
  },
  state: {
    $type: 'string'
  },
  code_challenge: {
    $type: 'string',
    $required: true
  },
  code_challenge_method: {
    $type: 'string',
    $required: true
  }
};

/**
 * Validate an authorization request and resolve the client that made it. Shared
 * by the three endpoints the authorization page calls, because all of them have
 * to reject a request the same way before showing or acting on anything.
 */
exports.validate = async function validate(db, params) {
  if (params.response_type !== 'code') {
    throw mcpOAuthError('unsupported_response_type', 'Only response_type=code is supported');
  }
  if (!params.code_challenge || params.code_challenge_method !== 'S256') {
    throw mcpOAuthError('invalid_request', 'PKCE with code_challenge_method=S256 is required');
  }
  if (params.scope != null && `${params.scope}`.split(/\s+/).some(scope => scope && scope !== SCOPE)) {
    throw mcpOAuthError('invalid_scope', `The only supported scope is "${SCOPE}"`);
  }

  const client = await db.models.MCPOAuthClient.resolve(params.client_id);
  if (!client.redirectUris.includes(params.redirect_uri)) {
    throw mcpOAuthError('invalid_request', 'redirect_uri is not registered for this OAuth client');
  }

  return {
    client,
    redirectUri: params.redirect_uri,
    resource: canonicalizeMCPResource(params.resource),
    state: params.state == null ? null : `${params.state}`,
    codeChallenge: params.code_challenge
  };
};

/** Send the MCP client back to its callback, with either a code or an error. */
exports.buildRedirect = function buildRedirect(request, query) {
  const redirect = new URL(request.redirectUri);
  for (const [key, value] of Object.entries(query)) {
    redirect.searchParams.set(key, value);
  }
  if (request.state != null) {
    redirect.searchParams.set('state', request.state);
  }
  redirect.searchParams.set('iss', exports.issuer());
  return redirect.toString();
};

/** This authorization server's issuer identifier. */
exports.issuer = function issuer() {
  return (process.env.MCP_OAUTH_ISSUER || 'https://mothership.mongoosestudio.app').replace(/\/+$/, '');
};
