'use strict';

const Archetype = require('archetype');
const connect = require('../../../db');
const mcpAuthorizationRequest = require('../../../util/mcpAuthorizationRequest');

const DenyMCPAuthorizationParams = new Archetype({
  authorization: { $type: 'string' },
  ...mcpAuthorizationRequest.paths
}).compile('DenyMCPAuthorizationParams');

/**
 * The user pressed "Deny": send the client back to its callback with an OAuth
 * error instead of leaving it waiting on a redirect that never happens.
 */
module.exports = async function denyMCPAuthorization(params) {
  const { authorization, ...oauthParams } = new DenyMCPAuthorizationParams(params);

  const db = await connect();
  const request = await mcpAuthorizationRequest.validate(db, oauthParams);

  return {
    redirect: mcpAuthorizationRequest.buildRedirect(request, {
      error: 'access_denied',
      error_description: 'The user denied the authorization request'
    })
  };
};
