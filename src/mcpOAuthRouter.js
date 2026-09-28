'use strict';

const express = require('express');
const fs = require('fs');
const mcpOAuthHTTP = require('./util/mcpOAuthHTTP');
const path = require('path');

const ACTIONS_DIR = path.join(__dirname, 'actions', 'mcp-oauth');
const WELL_KNOWN_METADATA_PATH = '/.well-known/oauth-authorization-server';

const actions = readActions(ACTIONS_DIR, '/mcp-oauth');

/**
 * All MCP OAuth HTTP endpoints, for running the mothership locally.
 *
 * In production these same paths are served by the Netlify functions in
 * `netlify/functions`, which `public/_redirects` maps them to. Both wrap the
 * same actions, so the two environments behave identically.
 *
 * The authorization endpoint itself is the static `/mcp-authorize` page.
 */
module.exports = function mcpOAuthRouter() {
  const router = express.Router();
  const bodyParser = express.text({ type: () => true });

  for (const [route, action] of Object.entries(actions)) {
    router.all(route, bodyParser, toRoute(action));
  }

  // RFC 8414 fixes where clients look for authorization server metadata, so that
  // one path cannot be derived from the action's location.
  router.all(WELL_KNOWN_METADATA_PATH, bodyParser, toRoute(actions['/mcp-oauth/metadata']));

  return router;
};

/**
 * Every MCP OAuth action, keyed by the route that serves it. The route is the
 * action's path under `src/actions`, so adding a file adds an endpoint and the
 * two can never drift.
 */
module.exports.actions = actions;
module.exports.WELL_KNOWN_METADATA_PATH = WELL_KNOWN_METADATA_PATH;

function toRoute(action) {
  return mcpOAuthHTTP.toExpressRoute(
    mcpOAuthHTTP.toActionHandler(action, { methods: [action.method || 'POST'] })
  );
}

function readActions(dir, route) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((actions, entry) => {
    if (entry.isDirectory()) {
      return { ...actions, ...readActions(path.join(dir, entry.name), `${route}/${entry.name}`) };
    }
    if (!entry.name.endsWith('.js')) {
      return actions;
    }
    return { ...actions, [`${route}/${entry.name.replace(/\.js$/, '')}`]: require(path.join(dir, entry.name)) };
  }, {});
}
