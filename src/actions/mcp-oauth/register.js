'use strict';

const Archetype = require('archetype');
const connect = require('../../db');
const crypto = require('crypto');
const mcpAuthorizationRequest = require('../../util/mcpAuthorizationRequest');
const mcpOAuthError = require('../../util/mcpOAuthError');

const RegisterParams = new Archetype({
  client_name: { $type: 'string' },
  client_uri: { $type: 'string' },
  logo_uri: { $type: 'string' },
  redirect_uris: { $type: ['string'] },
  grant_types: { $type: ['string'] },
  application_type: { $type: 'string' },
  token_endpoint_auth_method: { $type: 'string' }
}).compile('RegisterParams');

/**
 * RFC 7591 dynamic client registration. This is how ChatGPT and Claude get a
 * `client_id`: they register themselves the first time a user connects.
 */
module.exports = async function register(params) {
  const metadata = new RegisterParams(params);

  const db = await connect();
  const { MCPOAuthClient } = db.models;

  const redirectUris = MCPOAuthClient.validateRedirectUris(metadata.redirect_uris);
  if (metadata.token_endpoint_auth_method != null && metadata.token_endpoint_auth_method !== 'none') {
    throw mcpOAuthError('invalid_client_metadata', 'Only public clients using PKCE are supported');
  }
  for (const grantType of metadata.grant_types || []) {
    if (!['authorization_code', 'refresh_token'].includes(grantType)) {
      throw mcpOAuthError('invalid_client_metadata', `Unsupported grant type ${grantType}`);
    }
  }

  const client = await MCPOAuthClient.create({
    _id: `mcp_client_${crypto.randomBytes(24).toString('hex')}`,
    clientName: `${metadata.client_name || 'MCP Client'}`.slice(0, 120),
    clientUri: MCPOAuthClient.httpsUriOrNull(metadata.client_uri),
    logoUri: MCPOAuthClient.httpsUriOrNull(metadata.logo_uri),
    redirectUris,
    tokenEndpointAuthMethod: 'none',
    applicationType: metadata.application_type === 'native' ? 'native' : 'web'
  });

  return {
    client_id: client._id,
    client_id_issued_at: Math.floor(client.createdAt.valueOf() / 1000),
    client_name: client.clientName,
    client_uri: client.clientUri || undefined,
    logo_uri: client.logoUri || undefined,
    redirect_uris: client.redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: client.applicationType,
    scope: mcpAuthorizationRequest.SCOPE
  };
};

module.exports.statusCode = 201;
