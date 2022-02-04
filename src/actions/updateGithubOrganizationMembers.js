'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const mongoose = require('mongoose');
const githubApp = require('../integrations/githubApp');
const githubOAuth = require('../integrations/githubOAuth');

const UpdateGithubOrganizationMembersParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('UpdateGithubOrganizationMembersParams');

module.exports = ({ task, conn }) => async function updateGithubOrganizationMembers(params) {
  const { AccessToken, Subscriber } = conn.models;

  params = new UpdateGithubOrganizationMembersParams(params);
  const { authorization, _id } = params;

  /*const token = await task.sideEffect(async function findAccessToken({ _id }) {
    return AccessToken.findById({ _id }).exec();
  }, { _id: authorization });
  assert.ok(token, `Token ${authorization} not found`);

  assert.ok(token.subscriberId.toString() === _id.toString(),
    'Not authorized to update this subscriber');*/

  const subscriber = await task.sideEffect(async function findSubscriber({ _id }) {
    return Subscriber.findById(_id).exec();
  }, { _id });
  assert.ok(subscriber != null, `Subscriber ${_id} not found`);

  const githubOrganizationMembers = subscriber.installationId != null ?
    await githubApp.getOrganizationMembers(
      subscriber.installationId,
      subscriber.githubOrganization
    ) :
    await githubOAuth.getOrganizationMembers(subscriber.githubOrganization);

  console.log('AX', subscriber.installationId, githubOrganizationMembers);

  subscriber.githubOrganizationMembers = githubOrganizationMembers;

  await subscriber.save();

  return { subscriber };
};