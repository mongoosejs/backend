'use strict';

const mcpOAuthHTTP = require('../../src/util/mcpOAuthHTTP');

module.exports = mcpOAuthHTTP.toNetlifyFunction(
  mcpOAuthHTTP.toActionHandler(require('../../src/actions/mcp-oauth/revoke'), { methods: ['POST'] })
);
