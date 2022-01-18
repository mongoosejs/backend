'use strict';

const Archetype = require('archetype');

const VerifyGithubAccessTokenParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  }
}).compile('VerifyGithubAccessTokenParams');

module.exports = ({ task, conn }) => async function verifyGithubAccessToken(params) {
  const AccessToken = conn.model('AccessToken');
  const { authorization } = new VerifyGithubAccessTokenParams(params);
  
  const exists = await task.sideEffect(function exists({ _id }) {
    return AccessToken.exists({ _id }).then(v => !!v);
  }, { _id: authorization });

  return { exists };
};