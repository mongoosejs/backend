'use strict';

const approveMCPAuthorization = require('../src/actions/mcp-oauth/MCPOAuthGrant/approveMCPAuthorization');
const assert = require('assert');
const { beforeEach, describe, it } = require('mocha');
const connect = require('../src/db');
const createMCPOAuthToken = require('../src/actions/mcp-oauth/token');
const crypto = require('crypto');
const denyMCPAuthorization = require('../src/actions/mcp-oauth/MCPOAuthClient/denyMCPAuthorization');
const getMCPAuthorizationRequest = require('../src/actions/mcp-oauth/MCPOAuthClient/getMCPAuthorizationRequest');
const getMCPAuthorizationServerMetadata = require('../src/actions/mcp-oauth/metadata');
const introspectMCPAccessToken = require('../src/actions/mcp-oauth/MCPOAuthToken/introspectMCPAccessToken');
const listMCPGrants = require('../src/actions/mcp-oauth/MCPOAuthGrant/listMCPGrants');
const registerMCPOAuthClient = require('../src/actions/mcp-oauth/register');
const revokeMCPGrant = require('../src/actions/mcp-oauth/MCPOAuthGrant/revokeMCPGrant');
const revokeMCPOAuthToken = require('../src/actions/mcp-oauth/revoke');
const updateMCPGrant = require('../src/actions/mcp-oauth/MCPOAuthGrant/updateMCPGrant');

const RESOURCE = 'https://app.example.com/studio/mcp';
const REDIRECT_URI = 'https://claude.ai/api/mcp/auth_callback';

describe('MCP OAuth', function() {
  let db;
  let workspace;
  let user;
  let accessToken;
  let client;

  const codeVerifier = 'a'.repeat(64);
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  function authorizationRequest(overrides) {
    return {
      response_type: 'code',
      client_id: client.client_id,
      redirect_uri: REDIRECT_URI,
      resource: RESOURCE,
      state: 'client-state',
      scope: 'mcp',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...overrides
    };
  }

  async function authorize({ capabilities, roles } = {}) {
    if (roles) {
      await db.models.Workspace.updateOne({ _id: workspace._id }, { $set: { 'members.0.roles': roles } });
    }
    const { grant, redirect } = await approveMCPAuthorization({
      ...authorizationRequest(),
      authorization: accessToken._id,
      capabilities
    });
    return { grant, redirect, code: new URL(redirect).searchParams.get('code') };
  }

  function exchange(code, overrides) {
    return createMCPOAuthToken({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: client.client_id,
      redirect_uri: REDIRECT_URI,
      ...overrides
    });
  }

  beforeEach(async function() {
    db = await connect();
    const {
      AccessToken,
      MCPOAuthAuthorizationCode,
      MCPOAuthClient,
      MCPOAuthGrant,
      MCPOAuthToken,
      User,
      Workspace
    } = db.models;
    await Promise.all([
      AccessToken.deleteMany({}),
      MCPOAuthAuthorizationCode.deleteMany({}),
      MCPOAuthClient.deleteMany({}),
      MCPOAuthGrant.deleteMany({}),
      MCPOAuthToken.deleteMany({}),
      User.deleteMany({}),
      Workspace.deleteMany({})
    ]);

    user = await User.create({ name: 'Test User', email: 'test@example.com', githubUserId: 1234 });
    workspace = await Workspace.create({
      name: 'Test Workspace',
      apiKey: 'test-api-key',
      members: [{ userId: user._id, roles: ['owner'] }],
      mcpResources: [RESOURCE]
    });
    accessToken = await AccessToken.create({ userId: user._id });
    client = await registerMCPOAuthClient({ client_name: 'Claude', redirect_uris: [REDIRECT_URI] });
  });

  describe('discovery and registration', function() {
    it('advertises PKCE, refresh tokens, and dynamic registration', async function() {
      const metadata = await getMCPAuthorizationServerMetadata();

      assert.deepStrictEqual(metadata.code_challenge_methods_supported, ['S256']);
      assert.deepStrictEqual(metadata.grant_types_supported, ['authorization_code', 'refresh_token']);
      assert.deepStrictEqual(metadata.token_endpoint_auth_methods_supported, ['none']);
      assert.strictEqual(metadata.authorization_endpoint, `${metadata.issuer}/mcp-authorize`);
      assert.ok(metadata.registration_endpoint);
      assert.ok(metadata.revocation_endpoint);
      // Both ways of identifying a client are supported: dynamic registration
      // and a client ID metadata document URL.
      assert.strictEqual(metadata.client_id_metadata_document_supported, true);
    });

    it('registers a public client', function() {
      assert.ok(client.client_id.startsWith('mcp_client_'));
      assert.strictEqual(client.client_name, 'Claude');
      assert.strictEqual(client.token_endpoint_auth_method, 'none');
      assert.deepStrictEqual(client.redirect_uris, [REDIRECT_URI]);
    });

    it('rejects a client that wants a client secret', async function() {
      await assert.rejects(
        () => registerMCPOAuthClient({
          client_name: 'Confidential',
          redirect_uris: [REDIRECT_URI],
          token_endpoint_auth_method: 'client_secret_post'
        }),
        /Only public clients using PKCE are supported/
      );
    });

    it('rejects a non-HTTPS redirect URI', async function() {
      await assert.rejects(
        () => registerMCPOAuthClient({ client_name: 'Insecure', redirect_uris: ['http://evil.example.com/cb'] }),
        /Redirect URIs must use HTTPS/
      );
    });
  });

  describe('authorization request', function() {
    it('describes the client and workspace without a Studio session', async function() {
      const context = await getMCPAuthorizationRequest(authorizationRequest());

      assert.strictEqual(context.client.name, 'Claude');
      assert.strictEqual(context.workspace.name, 'Test Workspace');
      assert.strictEqual(context.resource, RESOURCE);
      assert.strictEqual(context.user, null);
      assert.strictEqual(context.maximum, null);
    });

    it('reports the most access an owner can delegate', async function() {
      const context = await getMCPAuthorizationRequest({ ...authorizationRequest(), authorization: accessToken._id });

      assert.strictEqual(context.user._id.toString(), user._id.toString());
      assert.strictEqual(context.maximum.write, true);
      assert.strictEqual(context.maximum.readPreference, 'primary');
      assert.strictEqual(context.maximum.maxTimeMS, 30000);
    });

    it('caps the reported maximum by the workspace policy', async function() {
      await db.models.Workspace.updateOne(
        { _id: workspace._id },
        { $set: { mcpPolicy: { write: false, readPreference: 'secondaryPreferred', maxTimeMS: 5000 } } }
      );
      const context = await getMCPAuthorizationRequest({ ...authorizationRequest(), authorization: accessToken._id });

      assert.strictEqual(context.maximum.write, false);
      assert.strictEqual(context.maximum.readPreference, 'secondaryPreferred');
      assert.strictEqual(context.maximum.maxTimeMS, 5000);
    });

    it('requires PKCE with S256', async function() {
      await assert.rejects(
        () => getMCPAuthorizationRequest({
          ...authorizationRequest({ code_challenge_method: 'plain' }),
          authorization: accessToken._id
        }),
        /PKCE with code_challenge_method=S256 is required/
      );
    });

    it('rejects a redirect URI the client did not register', async function() {
      await assert.rejects(
        () => getMCPAuthorizationRequest({
          ...authorizationRequest({ redirect_uri: 'https://evil.example.com/cb' }),
          authorization: accessToken._id
        }),
        /redirect_uri is not registered/
      );
    });

    it('rejects a resource that is not a known Studio deployment', async function() {
      await assert.rejects(
        () => getMCPAuthorizationRequest({
          ...authorizationRequest({ resource: 'https://other.example.com/mcp' }),
          authorization: accessToken._id
        }),
        /Unknown MCP resource/
      );
    });

    it('rejects a user who is not a workspace member', async function() {
      const otherUser = await db.models.User.create({ name: 'Other', email: 'other@example.com', githubUserId: 5678 });
      const otherToken = await db.models.AccessToken.create({ userId: otherUser._id });

      await assert.rejects(
        () => getMCPAuthorizationRequest({ ...authorizationRequest(), authorization: otherToken._id }),
        /not a member/
      );
    });

    it('sends the client home with an error when the user denies', async function() {
      const { redirect } = await denyMCPAuthorization(authorizationRequest());
      const url = new URL(redirect);

      assert.strictEqual(url.searchParams.get('error'), 'access_denied');
      assert.strictEqual(url.searchParams.get('state'), 'client-state');
    });
  });

  describe('grants', function() {
    it('stores only what the user is allowed to delegate', async function() {
      await db.models.Workspace.updateOne(
        { _id: workspace._id },
        { $set: { 'members.0.roles': ['readonly'], 'members.0.mcpPolicy': { readPreference: 'secondaryPreferred', maxTimeMS: 5000 } } }
      );

      const { grant } = await authorize({
        capabilities: { read: true, write: true, readPreference: 'primary', maxTimeMS: 30000 }
      });

      assert.strictEqual(grant.capabilities.write, false, 'a read-only user cannot delegate write access');
      assert.strictEqual(grant.capabilities.readPreference, 'secondaryPreferred');
      assert.strictEqual(grant.capabilities.maxTimeMS, 5000);
    });

    it('keeps a requested reduction of the user access', async function() {
      const { grant } = await authorize({
        capabilities: { read: true, write: false, readPreference: 'secondary', maxTimeMS: 1000 }
      });

      assert.strictEqual(grant.capabilities.write, false);
      assert.strictEqual(grant.capabilities.readPreference, 'secondary');
      assert.strictEqual(grant.capabilities.maxTimeMS, 1000);
      assert.strictEqual(grant.oauthClientName, 'Claude');
      assert.strictEqual(grant.resource, RESOURCE);
    });

    it('does not store MongoDB credentials on the grant or its tokens', async function() {
      const { grant, code } = await authorize();
      const tokens = await exchange(code);

      const serialized = JSON.stringify([grant.toObject(), tokens]);
      assert.ok(!serialized.includes('mongodb'), 'grants and tokens must not carry connection strings');
      assert.ok(!serialized.includes(workspace.apiKey), 'grants and tokens must not carry the Studio API key');
    });
  });

  describe('token exchange', function() {
    it('exchanges a code for a short-lived access token and a refresh token', async function() {
      const { code } = await authorize();
      const tokens = await exchange(code, { resource: RESOURCE });

      assert.strictEqual(tokens.token_type, 'Bearer');
      assert.strictEqual(tokens.scope, 'mcp');
      assert.strictEqual(tokens.expires_in, 900);
      assert.ok(tokens.access_token.startsWith('mcp_at_'));
      assert.ok(tokens.refresh_token.startsWith('mcp_rt_'));
    });

    it('rejects a mismatched PKCE verifier', async function() {
      const { code } = await authorize();

      await assert.rejects(() => exchange(code, { code_verifier: 'b'.repeat(64) }), /PKCE verification failed/);
    });

    it('rejects a replayed authorization code', async function() {
      const { code } = await authorize();
      await exchange(code);

      await assert.rejects(() => exchange(code), /already used/);
    });

    it('rejects a code redeemed for a different resource', async function() {
      const { code } = await authorize();

      await assert.rejects(
        () => exchange(code, { resource: 'https://other.example.com/mcp' }),
        /resource does not match/
      );
    });

    it('rejects an unsupported grant type', async function() {
      await assert.rejects(
        () => createMCPOAuthToken({ grant_type: 'password', client_id: client.client_id }),
        /Supported grant types are/
      );
    });

    it('rotates refresh tokens and rejects the old one', async function() {
      const { code } = await authorize();
      const first = await exchange(code);

      const refreshed = await createMCPOAuthToken({
        grant_type: 'refresh_token',
        refresh_token: first.refresh_token,
        client_id: client.client_id
      });
      assert.notStrictEqual(refreshed.access_token, first.access_token);
      assert.notStrictEqual(refreshed.refresh_token, first.refresh_token);

      await assert.rejects(
        () => createMCPOAuthToken({
          grant_type: 'refresh_token',
          refresh_token: first.refresh_token,
          client_id: client.client_id
        }),
        /invalid, expired, or revoked/
      );

      // The rotated token still works, so a client never has to reconnect.
      const introspected = await introspectMCPAccessToken({
        apiKey: workspace.apiKey,
        token: refreshed.access_token,
        resource: RESOURCE
      });
      assert.strictEqual(introspected.permissions.read, true);
    });
  });

  describe('enforcement', function() {
    let tokens;

    beforeEach(async function() {
      const { code } = await authorize({
        capabilities: { read: true, write: true, readPreference: 'secondaryPreferred', maxTimeMS: 5000 }
      });
      tokens = await exchange(code);
    });

    function introspect(overrides) {
      return introspectMCPAccessToken({
        apiKey: workspace.apiKey,
        token: tokens.access_token,
        resource: RESOURCE,
        ...overrides
      });
    }

    it('resolves the current effective authorization for a Studio deployment', async function() {
      const { permissions } = await introspect();

      assert.strictEqual(permissions.write, true);
      assert.strictEqual(permissions.readPreference, 'secondaryPreferred');
      assert.strictEqual(permissions.maxTimeMS, 5000);
      assert.deepStrictEqual(permissions.roles, ['owner']);
    });

    it('rejects a token presented by another workspace', async function() {
      await db.models.Workspace.create({ name: 'Other', apiKey: 'other-api-key', members: [] });

      await assert.rejects(() => introspect({ apiKey: 'other-api-key' }), /another workspace/);
    });

    it('rejects a token presented for another resource', async function() {
      await db.models.Workspace.updateOne(
        { _id: workspace._id },
        { $addToSet: { mcpResources: 'https://app.example.com/other/mcp' } }
      );

      await assert.rejects(
        () => introspect({ resource: 'https://app.example.com/other/mcp' }),
        /audience does not match/
      );
    });

    it('follows the user losing write access without reissuing tokens', async function() {
      await db.models.Workspace.updateOne({ _id: workspace._id }, { $set: { 'members.0.roles': ['readonly'] } });

      const { permissions } = await introspect();
      assert.strictEqual(permissions.write, false);
      assert.deepStrictEqual(permissions.roles, ['readonly']);
    });

    it('follows the workspace tightening its policy', async function() {
      await db.models.Workspace.updateOne(
        { _id: workspace._id },
        { $set: { mcpPolicy: { write: false, readPreference: 'secondary', maxTimeMS: 1000 } } }
      );

      const { permissions } = await introspect();
      assert.strictEqual(permissions.write, false);
      assert.strictEqual(permissions.readPreference, 'secondary');
      assert.strictEqual(permissions.maxTimeMS, 1000);
    });

    it('applies an edited grant without issuing a new credential', async function() {
      const { grants } = await listMCPGrants({ authorization: accessToken._id });
      await updateMCPGrant({
        authorization: accessToken._id,
        grantId: grants[0]._id,
        capabilities: { read: true, write: false, readPreference: 'secondary', maxTimeMS: 1000 }
      });

      const { permissions } = await introspect();
      assert.strictEqual(permissions.write, false);
      assert.strictEqual(permissions.readPreference, 'secondary');
      assert.strictEqual(permissions.maxTimeMS, 1000);
    });

    it('stops working as soon as the user revokes the grant', async function() {
      const { grants } = await listMCPGrants({ authorization: accessToken._id });
      const { grant } = await revokeMCPGrant({ authorization: accessToken._id, grantId: grants[0]._id });
      assert.ok(grant.revokedAt instanceof Date);

      await assert.rejects(() => introspect(), /invalid, expired, or revoked|revoked/);
      await assert.rejects(
        () => createMCPOAuthToken({
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
          client_id: client.client_id
        }),
        /invalid, expired, or revoked|revoked/
      );
    });

    it('revokes the whole grant when the client revokes its refresh token', async function() {
      await revokeMCPOAuthToken({ token: tokens.refresh_token });

      const { grants } = await listMCPGrants({ authorization: accessToken._id });
      assert.ok(grants[0].revokedAt instanceof Date);
      await assert.rejects(() => introspect(), /invalid, expired, or revoked|revoked/);
    });

    it('revokes only the access token when the client revokes that', async function() {
      await revokeMCPOAuthToken({ token: tokens.access_token });

      const { grants } = await listMCPGrants({ authorization: accessToken._id });
      assert.strictEqual(grants[0].revokedAt, undefined);
      await assert.rejects(() => introspect(), /invalid, expired, or revoked/);

      // The client can still refresh, so revoking one access token is not a
      // disconnect.
      const refreshed = await createMCPOAuthToken({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: client.client_id
      });
      assert.ok(refreshed.access_token.startsWith('mcp_at_'));
    });

    it('answers a revocation of an unknown token without failing', async function() {
      await revokeMCPOAuthToken({ token: 'mcp_rt_unknown' });
    });

    it('will not let a revoked user delegate access at all', async function() {
      await db.models.Workspace.updateOne({ _id: workspace._id }, { $set: { members: [] } });

      await assert.rejects(() => authorize(), /not a member/);
    });

    it('requires a Studio session to authorize', async function() {
      await assert.rejects(
        () => approveMCPAuthorization({ ...authorizationRequest(), capabilities: { read: true } }),
        err => err.status === 401 && /sign-in is required/.test(err.message)
      );
    });
  });
});
