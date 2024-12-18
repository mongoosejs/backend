'use strict'

const extrovert = require('extrovert');
const pkg = require('../package.json');

module.exports = extrovert.toNetlifyFunction(async function status() {
  return { ok: 1, version: pkg.version, nodeVersion: process.version };
});