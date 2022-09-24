'use strict'

const azureWrapper = require('../util/azureWrapper');
const requestInvite = require('../src/actions/requestInvite');

module.exports = azureWrapper(async function requestSlackInvite(context, req) {
  return await requestInvite()(req.query.email);
});