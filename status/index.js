'use strict'

const azureWrapper = require('../util/azureWrapper');
const pkg = require('../package.json');

module.exports = azureWrapper(async function status() {
  return { ok: 1, version: pkg.version };
});