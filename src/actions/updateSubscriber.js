'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const mongoose = require('mongoose');

const UpdateSubscriberParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  company: {
    $type: 'string',
    $required: true
  },
  description: {
    $type: 'string',
    $required: true
  },
  logo: {
    $type: 'string',
    $required: true
  }
}).compile('UpdateSubscriberParams');

module.exports = ({ task, conn }) => async function updateSubscriber(params) {
  console.log('AF', conn.models);
  const { AccessToken, Subscriber } = conn.models;

  const { authorization, _id, companyName, description, logo } = new UpdateSubscriberParams(params);

  const token = await AccessToken.findById({ _id: authorization });
  assert.ok(token, `Token ${authorization} not found`);

  assert.ok(token.subscriberId.toString() === _id.toString(),
    'Not authorized to update this subscriber');

  const subscriber = await Subscriber.findById(_id);
  subscriber.companyName = companyName;
  subscriber.description = description;
  subscriber.logo = logo;
  await subscriber.save();

  return { subscriber };
};