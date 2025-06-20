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
  
  const token = await task.sideEffect(function exists({ _id }) {
    return AccessToken.findOne({ _id }).populate('userId');
  }, { _id: authorization });

  return { exists: !!token, token };
};