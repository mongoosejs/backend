'use strict';

const mcpAuthorizationRequest = require('../../util/mcpAuthorizationRequest');

/**
 * RFC 8414 authorization server metadata. MCP clients fetch this from
 * `/.well-known/oauth-authorization-server` after a Studio deployment's
 * protected resource metadata points them here.
 */
module.exports = async function metadata() {
  const issuer = mcpAuthorizationRequest.issuer();

  return {
    issuer,
    authorization_endpoint: `${issuer}/mcp-authorize`,
    token_endpoint: `${issuer}/mcp-oauth/token`,
    registration_endpoint: `${issuer}/mcp-oauth/register`,
    // Clients may skip registration entirely and use an HTTPS client ID
    // metadata document URL as their `client_id`. Parameter name comes from
    // draft-parecki-oauth-client-id-metadata-document.
    client_id_metadata_document_supported: true,
    revocation_endpoint: `${issuer}/mcp-oauth/revoke`,
    scopes_supported: [mcpAuthorizationRequest.SCOPE],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    revocation_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    service_documentation: 'https://mongoosestudio.app/docs/'
  };
};

// Served at `/.well-known/oauth-authorization-server` as well, which is where
// RFC 8414 says clients look.
module.exports.method = 'GET';
