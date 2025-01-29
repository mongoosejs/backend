'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const mongoose = require('mongoose');

const MeParams = new Archetype({
  authorization: {
    $type: 'string'
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('MeParams');

module.exports = extrovert.toNetlifyFunction(async function me(params) {
  const { authorization, workspaceId } = new MeParams(params);

  const db = await connect();
  const { AccessToken, User, Workspace } = db.models;

  if (!authorization) {
    return { user: null };
  }

  const accessToken = await AccessToken.findById(authorization);
  if (!accessToken) {
    return { user: null };
  }

  const user = await User.
    findOne({ _id: accessToken.userId }).
    orFail();
  const workspace = await Workspace.findById(workspaceId).orFail();
  const roles = workspace.members.find(member => member.userId.toString() === user._id.toString())?.roles ?? null;

  return { user, roles };
});
