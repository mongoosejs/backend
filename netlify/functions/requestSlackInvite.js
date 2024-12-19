'use strict';

const Archetype = require('archetype');
const extrovert = require('extrovert');
const requestInvite = require('../../src/actions/requestInvite');

const RequestSlackInviteParams = new Archetype({
  email: {
    $type: 'string',
    $required: true
  }
}).compile('RequestSlackInviteParams');

module.exports = extrovert.toNetlifyFunction(async function requestSlackInvite(params) {
  const { email } = new RequestSlackInviteParams(params);
  return await requestInvite()(email);
});