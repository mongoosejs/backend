'use strict'

const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');
const verifyGithubAccessToken = require('../src/actions/verifyGithubAccessToken');

module.exports = azureWrapper(async function(context, req) {
  const conn = await connect();
  const Task = conn.model('Task');

  const task = await Task.create({
    method: req.method,
    url: req.url,
    params: req.body
  });

  const params = { authorization: req.headers.authorization };

  const res = await verifyGithubAccessToken({ task, conn })(params);

  return res;
});