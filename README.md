# search
Backend for Mongoose docs search

Note to self(D): npm install azure-functions-core-tools when working on this branch.

## MCP OAuth

This server is the OAuth 2.1 authorization server for Mongoose Studio's MCP support.
Studio deployments are the protected resources; see `../studio/docs/mcp-oauth.md` for the full design.

In production these endpoints are the Netlify functions in `netlify/functions`, which `public/_redirects` maps the paths below to.
Locally, `src/mcpOAuthRouter.js` serves the same paths from `index.js`.
Both share the handlers in `src/mcpOAuthHttp.js`, so the status codes and bodies are identical either way.

Endpoints:

Every route below is served by the action at the same path under `src/actions`, so the two cannot drift:
`POST /mcp-oauth/MCPOAuthGrant/revokeMCPGrant` is `src/actions/mcp-oauth/MCPOAuthGrant/revokeMCPGrant.js`.
`src/mcpOAuthRouter.js` walks that directory rather than listing routes, and each action's Netlify function is the same path with `/` replaced by `-`.

| Path | Purpose |
| --- | --- |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 authorization server metadata, aliased to `/mcp-oauth/metadata` because the spec fixes where clients look |
| `GET /mcp-authorize` | The static consent page an MCP client sends the user to |
| `POST /mcp-oauth/register` | RFC 7591 dynamic client registration |
| `POST /mcp-oauth/token` | Authorization code and refresh token grants |
| `POST /mcp-oauth/revoke` | RFC 7009 token revocation |
| `POST /mcp-oauth/MCPOAuthClient/getMCPAuthorizationRequest` | Describes a pending request for the consent page |
| `POST /mcp-oauth/MCPOAuthClient/denyMCPAuthorization` | Returns the client redirect with `error=access_denied` |
| `POST /mcp-oauth/MCPOAuthGrant/approveMCPAuthorization` | Creates a grant and returns the client redirect |
| `POST /mcp-oauth/MCPOAuthGrant/listMCPGrants` | The signed in user's connected MCP clients |
| `POST /mcp-oauth/MCPOAuthGrant/updateMCPGrant` | Narrows an existing grant without reissuing tokens |
| `POST /mcp-oauth/MCPOAuthGrant/revokeMCPGrant` | Revokes a grant and all of its tokens |
| `POST /mcp-oauth/MCPOAuthToken/introspectMCPAccessToken` | Resolves an access token for a Studio deployment |
| `POST /mcp-oauth/Workspace/registerMCPResource` | Maps a Studio MCP URL to a workspace |

Below `mcp-oauth`, actions are grouped by the primary model they act on.
The three endpoints MCP clients discover from the metadata document sit directly under `mcp-oauth` with short, stable OAuth paths.

The OAuth behavior lives in those actions and on the schemas in `src/db`, not in a service module.
`src/util/mcpOAuthHTTP.js` is transport only: it adapts an action to a Netlify function or an Express route.

Set `MCP_OAUTH_ISSUER` to this server's public origin.
It defaults to `https://mothership.mongoosestudio.app` and is what appears as the `issuer` in the metadata document, so it must match the origin clients actually reach.
