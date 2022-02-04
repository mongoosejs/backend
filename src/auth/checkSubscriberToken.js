'use strict';

const Archetype = require('archetype');
const assert = require('assert');

const CheckSubscriberTokenParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('CheckSubscriberTokenParams');

module.exports = ({ task, conn }) => async function checkSubscriberToken(params) {
  const { AccessToken } = conn.models;

  params = new CheckSubscriberTokenParams(params);
  const { authorization, _id } = params;

  const token = await task.sideEffect(async function findAccessToken({ _id }) {
    return AccessToken.findById({ _id }).exec();
  }, { _id: authorization });
  assert.ok(token, `Token ${authorization} not found`);

  assert.ok(token.subscriberId.toString() === _id.toString(),
    'Not authorized to update this subscriber');
};