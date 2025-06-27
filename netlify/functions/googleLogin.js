'use strict';

const Archetype = require('archetype');
const extrovert = require('extrovert');
const google = require('../../src/integrations/google');

const GoogleLoginParams = new Archetype({
  callbackUrl: {
    $type: 'string',
    $default: process.env.GOOGLE_OAUTH_CALLBACK_URL
  },
  state: {
    $type: 'string'
  }
}).compile('GoogleLoginParams');

module.exports = extrovert.toNetlifyFunction(async function googleLogin(params) {
  const { callbackUrl, state } = new GoogleLoginParams(params);
  const authorizationUrl = await google.generateAuthUrl(callbackUrl, state);
  return { url: authorizationUrl };
});
