'use strict';

const mcpOAuthError = require('./mcpOAuthError');

/**
 * RFC 8707 resource indicators are compared as strings, so normalize the
 * spellings that mean the same MCP endpoint before storing or matching them.
 */
module.exports = function canonicalizeMCPResource(resource) {
  let url;
  try {
    url = new URL(`${resource}`);
  } catch (err) {
    throw mcpOAuthError('invalid_target', 'Invalid MCP resource URI');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw mcpOAuthError('invalid_target', 'MCP resource URIs must be HTTP(S) URLs');
  }
  url.hash = '';
  url.search = '';
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }
  return url.toString();
};
