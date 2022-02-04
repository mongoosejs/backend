'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const mongoose = require('mongoose');
const { omit } = require('ramda');
const githubOAuth = require('../integrations/githubOAuth');

const UpdateSubscriberParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  companyName: {
    $type: 'string'
  },
  description: {
    $type: 'string'
  },
  logo: {
    $type: 'string'
  },
  githubOrganization: {
    $type: 'string'
  }
}).compile('UpdateSubscriberParams');

module.exports = ({ task, conn }) => async function updateSubscriber(params) {
  const { AccessToken, Subscriber } = conn.models;

  params = new UpdateSubscriberParams(params);
  const { authorization, _id } = params;

  const token = await task.sideEffect(async function findAccessToken({ _id }) {
    return AccessToken.findById({ _id }).exec();
  }, { _id: authorization });
  assert.ok(token, `Token ${authorization} not found`);

  assert.ok(token.subscriberId.toString() === _id.toString(),
    'Not authorized to update this subscriber');

  const subscriber = await task.sideEffect(async function findSubscriber({ _id }) {
    return Subscriber.findById(_id).exec();
  }, { _id });
  assert.ok(subscriber != null, `Subscriber ${_id} not found`);
  subscriber.set(omit(['_id', 'authorization'], params));

  if (params.githubOrganization != null) {
    subscriber.githubOrganizationId = await task.sideEffect(
      githubOAuth.getOrganizationId,
      params.githubOrganization
    );
  }

  await subscriber.save();

  return { subscriber };
};