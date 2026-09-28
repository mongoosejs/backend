'use strict';

const assert = require('assert');
const { after, before, beforeEach, describe, it } = require('mocha');
const connect = require('../src/db');
const crypto = require('crypto');
const express = require('express');
const mcpOAuthHTTP = require('../src/util/mcpOAuthHTTP');
const mcpOAuthRouter = require('../src/mcpOAuthRouter');

const RESOURCE = 'https://app.example.com/studio/mcp';
const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';

/**
 * Walks the whole flow over HTTP the way an MCP client does: discover, register,
 * authorize, exchange, call, refresh, revoke. Also covers the Netlify wrappers,
 * since those are what serve these paths in production.
 */
describe('MCP OAuth end to end', function() {
  let server;
  let baseUrl;
  let db;
  let workspace;
  let studioSession;

  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  before(async function() {
    const app = express();
    app.use(mcpOAuthRouter());
    await new Promise(resolve => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async function() {
    // `fetch` keeps connections alive, and `close()` waits for them, so drop
    // them explicitly or the test process hangs on exit.
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  beforeEach(async function() {
    db = await connect();
    const { AccessToken, MCPOAuthClient, MCPOAuthGrant, MCPOAuthToken, User, Workspace } = db.models;
    await Promise.all([
      AccessToken.deleteMany({}),
      MCPOAuthClient.deleteMany({}),
      MCPOAuthGrant.deleteMany({}),
      MCPOAuthToken.deleteMany({}),
      User.deleteMany({}),
      Workspace.deleteMany({})
    ]);

    const user = await User.create({ name: 'Test User', email: 'test@example.com', githubUserId: 4321 });
    workspace = await Workspace.create({
      name: 'Test Workspace',
      apiKey: 'flow-api-key',
      members: [{ userId: user._id, roles: ['owner'] }]
    });
    studioSession = await AccessToken.create({ userId: user._id });
  });

  function get(path) {
    return fetch(`${baseUrl}${path}`).then(async res => ({ status: res.status, body: await res.json() }));
  }

  function form(path, body) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString()
    }).then(async res => ({ status: res.status, body: await res.json() }));
  }

  function post(path, body, authorization) {
    const headers = { 'Content-Type': 'application/json' };
    if (authorization) {
      headers.Authorization = authorization;
    }
    return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }).
      then(async res => ({ status: res.status, body: await res.json() }));
  }

  it('runs the authorization code flow with PKCE, then refreshes and revokes', async function() {
    // A Studio deployment announces the MCP URL it answers on.
    const registered = await post('/mcp-oauth/Workspace/registerMCPResource', {
      apiKey: workspace.apiKey,
      resource: `${RESOURCE}/`
    });
    assert.strictEqual(registered.status, 200);
    assert.strictEqual(registered.body.resource, RESOURCE);

    // 1. The client discovers the authorization server.
    const metadata = await get('/.well-known/oauth-authorization-server');
    assert.strictEqual(metadata.status, 200);
    assert.deepStrictEqual(metadata.body.code_challenge_methods_supported, ['S256']);

    // 2. The client registers itself.
    const registration = await post('/mcp-oauth/register', {
      client_name: 'Claude',
      redirect_uris: [REDIRECT_URI]
    });
    assert.strictEqual(registration.status, 201);
    const client = registration.body;

    const authorizationRequest = {
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: REDIRECT_URI,
      resource: RESOURCE,
      state: 'client-state',
      scope: 'mcp',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    };

    // 3. The user opens the authorization page, which describes the request.
    const context = await post(
      '/mcp-oauth/MCPOAuthClient/getMCPAuthorizationRequest',
      authorizationRequest,
      studioSession._id
    );
    assert.strictEqual(context.status, 200);
    assert.strictEqual(context.body.client.name, 'Claude');
    assert.strictEqual(context.body.workspace.name, 'Test Workspace');
    assert.strictEqual(context.body.maximum.write, true);

    // 4. The user authorizes a reduced set of capabilities.
    const approval = await post('/mcp-oauth/MCPOAuthGrant/approveMCPAuthorization', {
      ...authorizationRequest,
      capabilities: { read: true, write: false, readPreference: 'secondary', maxTimeMS: 5000 }
    }, studioSession._id);
    assert.strictEqual(approval.status, 200);
    const redirect = new URL(approval.body.redirect);
    assert.strictEqual(redirect.origin + redirect.pathname, REDIRECT_URI);
    assert.strictEqual(redirect.searchParams.get('state'), 'client-state');

    // 5. The client exchanges the code for tokens, form encoded.
    const tokens = await form('/mcp-oauth/token', {
      grant_type: 'authorization_code',
      code: redirect.searchParams.get('code'),
      code_verifier: codeVerifier,
      client_id: client.client_id,
      redirect_uri: REDIRECT_URI,
      resource: RESOURCE
    });
    assert.strictEqual(tokens.status, 200);
    assert.strictEqual(tokens.body.token_type, 'Bearer');
    assert.strictEqual(tokens.body.expires_in, 900);

    // 6. Studio resolves the token on an MCP request.
    const introspected = await post('/mcp-oauth/MCPOAuthToken/introspectMCPAccessToken', {
      apiKey: workspace.apiKey,
      token: tokens.body.access_token,
      resource: RESOURCE
    });
    assert.strictEqual(introspected.status, 200);
    assert.strictEqual(introspected.body.permissions.write, false);
    assert.strictEqual(introspected.body.permissions.readPreference, 'secondary');
    assert.strictEqual(introspected.body.permissions.maxTimeMS, 5000);
    assert.deepStrictEqual(introspected.body.permissions.roles, ['readonly']);

    // 7. The access token expires quickly, so the client refreshes it.
    const refreshed = await form('/mcp-oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: tokens.body.refresh_token,
      client_id: client.client_id,
      resource: RESOURCE
    });
    assert.strictEqual(refreshed.status, 200);
    assert.notStrictEqual(refreshed.body.access_token, tokens.body.access_token);

    // 8. The user edits the grant: no new credential, new policy.
    const grants = await post('/mcp-oauth/MCPOAuthGrant/listMCPGrants', {}, studioSession._id);
    assert.strictEqual(grants.body.grants.length, 1);
    assert.strictEqual(grants.body.grants[0].workspaceName, 'Test Workspace');
    await post('/mcp-oauth/MCPOAuthGrant/updateMCPGrant', {
      grantId: grants.body.grants[0]._id,
      capabilities: { read: true, write: false, readPreference: 'secondary', maxTimeMS: 1000 }
    }, studioSession._id);
    const afterEdit = await post('/mcp-oauth/MCPOAuthToken/introspectMCPAccessToken', {
      apiKey: workspace.apiKey,
      token: refreshed.body.access_token,
      resource: RESOURCE
    });
    assert.strictEqual(afterEdit.body.permissions.maxTimeMS, 1000);

    // 9. The client disconnects, which revokes the grant.
    const revocation = await form('/mcp-oauth/revoke', { token: refreshed.body.refresh_token });
    assert.strictEqual(revocation.status, 200);
    const afterRevoke = await post('/mcp-oauth/MCPOAuthToken/introspectMCPAccessToken', {
      apiKey: workspace.apiKey,
      token: refreshed.body.access_token,
      resource: RESOURCE
    });
    assert.strictEqual(afterRevoke.status, 401);
  });

  it('serves one route per action file, and a Netlify function for each', function() {
    const fs = require('fs');

    for (const [route, action] of Object.entries(mcpOAuthRouter.actions)) {
      assert.ok(typeof action === 'function', `${route} must export an action`);
      assert.ok(
        fs.existsSync(`${__dirname}/../src/actions${route}.js`),
        `${route} must be served by src/actions${route}.js`
      );
      const netlifyFunction = `${route.replace(/^\//, '').replace(/\//g, '-')}.js`;
      assert.ok(
        fs.existsSync(`${__dirname}/../netlify/functions/${netlifyFunction}`),
        `${route} must have a Netlify function at netlify/functions/${netlifyFunction}`
      );
      assert.ok(
        fs.readFileSync(`${__dirname}/../public/_redirects`, 'utf8').includes(`${route} `),
        `${route} must be listed in public/_redirects`
      );
    }
  });

  it('returns an OAuth error body with a 400 for a bad grant', async function() {
    const response = await form('/mcp-oauth/token', {
      grant_type: 'authorization_code',
      code: 'nope',
      code_verifier: codeVerifier,
      client_id: 'mcp_client_whatever',
      redirect_uri: REDIRECT_URI
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(response.body.error, 'invalid_grant');
    assert.ok(response.body.error_description);
  });

  it('rejects GET on the token endpoint', async function() {
    const response = await get('/mcp-oauth/token');

    assert.strictEqual(response.status, 405);
  });

  it('rejects an authorization request without a Studio session', async function() {
    const client = await post('/mcp-oauth/register', { client_name: 'Claude', redirect_uris: [REDIRECT_URI] });
    await post('/mcp-oauth/Workspace/registerMCPResource', { apiKey: workspace.apiKey, resource: RESOURCE });

    const approval = await post('/mcp-oauth/MCPOAuthGrant/approveMCPAuthorization', {
      response_type: 'code',
      client_id: client.body.client_id,
      redirect_uri: REDIRECT_URI,
      resource: RESOURCE,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      capabilities: { read: true }
    });

    assert.strictEqual(approval.status, 401);
    assert.strictEqual(approval.body.error, 'login_required');
  });

  // Production serves these paths as Netlify functions, so the wrappers get the
  // same treatment as the Express routes.
  describe('Netlify functions', function() {
    it('reports an invalid token as a 401 rather than a 500', async function() {
      const introspect = require('../netlify/functions/mcp-oauth-MCPOAuthToken-introspectMCPAccessToken');
      const response = await introspect.handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiKey: workspace.apiKey, token: 'mcp_at_nope', resource: RESOURCE })
      });

      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(JSON.parse(response.body).error, 'invalid_token');
    });

    it('registers a client with a 201', async function() {
      const register = require('../netlify/functions/mcp-oauth-register');
      const response = await register.handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_name: 'ChatGPT', redirect_uris: ['https://chatgpt.com/connector_platform_oauth_redirect'] })
      });

      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(JSON.parse(response.body).client_name, 'ChatGPT');
    });

    it('answers a CORS preflight', async function() {
      const metadata = require('../netlify/functions/mcp-oauth-metadata');
      const response = await metadata.handler({ httpMethod: 'OPTIONS', headers: {} });

      assert.strictEqual(response.statusCode, 204);
    });

    it('parses a form encoded token request', async function() {
      const token = require('../netlify/functions/mcp-oauth-token');
      const response = await token.handler({
        httpMethod: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'password' }).toString()
      });

      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(JSON.parse(response.body).error, 'unsupported_grant_type');
    });

    it('shares its request parsing with the Express routes', function() {
      const request = mcpOAuthHTTP.toRequest({
        method: 'post',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        rawBody: 'grant_type=refresh_token&client_id=abc'
      });

      assert.deepStrictEqual(request.params, { grant_type: 'refresh_token', client_id: 'abc' });
      assert.strictEqual(request.method, 'POST');
    });
  });
});
