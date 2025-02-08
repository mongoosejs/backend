'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const GetWorkspaceParams = new Archetype({
  apiKey: {
    $type: 'string',
    $required: true
  }
}).compile('GetWorkspaceParams');

module.exports = async function getWorkspace(params) {
  const { apiKey } = new GetWorkspaceParams(params);

  const db = await connect();
  const { Workspace } = db.models;

  const workspace = await Workspace.findOne({ apiKey }).orFail();

  return { workspace };
};
