'use strict';

const mcpOAuthError = require('../util/mcpOAuthError');
const mongoose = require('mongoose');

// An OAuth client registered via RFC 7591 dynamic client registration, for
// example ChatGPT or Claude. MCP clients are public clients, so there is no
// client secret: PKCE and the registered redirect URIs are what bind an
// authorization code to the client that requested it.
const mcpOAuthClientSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  clientName: { type: String, required: true },
  clientUri: { type: String },
  logoUri: { type: String },
  redirectUris: [{ type: String, required: true }],
  tokenEndpointAuthMethod: { type: String, enum: ['none'], default: 'none' },
  applicationType: { type: String, enum: ['native', 'web'], default: 'web' }
}, {
  timestamps: true,
  id: false,
  statics: {
    /**
     * Find the client behind a `client_id`. Clients that registered dynamically
     * are stored here; clients that publish a client ID metadata document
     * instead use an HTTPS URL as their `client_id`, which is fetched on demand.
     */
    async resolve(clientId) {
      const registered = clientId ? await this.findById(clientId) : null;
      if (registered) {
        return registered;
      }

      let url;
      try {
        url = new URL(clientId);
      } catch (err) {
        throw mcpOAuthError('invalid_request', 'Unknown OAuth client');
      }
      if (url.protocol !== 'https:') {
        throw mcpOAuthError('invalid_request', 'Client ID metadata URLs must use HTTPS');
      }

      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw mcpOAuthError('invalid_request', 'Unable to load OAuth client metadata');
      }
      const metadata = await response.json();
      if (metadata.client_id !== clientId) {
        throw mcpOAuthError('invalid_request', 'OAuth client metadata client_id mismatch');
      }

      return {
        _id: clientId,
        clientName: `${metadata.client_name || url.hostname}`.slice(0, 120),
        clientUri: this.httpsUriOrNull(metadata.client_uri),
        redirectUris: this.validateRedirectUris(metadata.redirect_uris)
      };
    },

    /**
     * A redirect URI is the only thing standing between an authorization code
     * and an attacker, so reject anything that is not HTTPS, a loopback address,
     * or an app's own custom scheme.
     */
    validateRedirectUris(redirectUris) {
      if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
        throw mcpOAuthError('invalid_client_metadata', 'redirect_uris must be a non-empty array');
      }
      return redirectUris.map(redirectUri => {
        let url;
        try {
          url = new URL(redirectUri);
        } catch (err) {
          throw mcpOAuthError('invalid_client_metadata', `Invalid redirect URI ${redirectUri}`);
        }
        const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
        const customScheme = !['http:', 'https:'].includes(url.protocol);
        if (url.protocol !== 'https:' && !customScheme && !(loopback && url.protocol === 'http:')) {
          throw mcpOAuthError('invalid_client_metadata', 'Redirect URIs must use HTTPS, except loopback redirects');
        }
        if (url.hash) {
          throw mcpOAuthError('invalid_client_metadata', 'Redirect URIs must not contain fragments');
        }
        return redirectUri;
      });
    },

    httpsUriOrNull(uri) {
      if (typeof uri !== 'string' || uri.length === 0) {
        return null;
      }
      let url;
      try {
        url = new URL(uri);
      } catch (err) {
        return null;
      }
      return url.protocol === 'https:' ? url.toString() : null;
    }
  }
});

module.exports = mcpOAuthClientSchema;
