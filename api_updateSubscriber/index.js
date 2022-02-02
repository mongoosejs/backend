'use strict'

const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');
const updateSubscriber = require('../src/actions/updateSubscriber');

module.exports = azureWrapper(async function (context, req) {
  const conn = await connect();
  const { Task } = conn.models;

  const task = await Task.create({
    method: req.method,
    url: req.url,
    params: req.body
  });

  const params = Object.assign({}, req.body, { authorization: req.headers.authorization });

  return updateSubscriber({ task, conn })(params);
});