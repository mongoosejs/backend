'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const mongoose = require('mongoose');

const MeParams = new Archetype({
  authorization: {
    $type: 'string'
  }
}).compile('MeParams');

module.exports = extrovert.toNetlifyFunction(async function me(params) {
  const { authorization } = new MeParams(params);

  const db = await connect();
  const { AccessToken, User } = db.models;

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

  return { user };
});
