'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const mongoose = require('mongoose');
const githubApp = require('../integrations/githubApp');
const githubOAuth = require('../integrations/githubOAuth');

const UpdateGithubOrganizationMembersParams = new Archetype({
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('UpdateGithubOrganizationMembersParams');

module.exports = ({ task, conn }) => async function updateGithubOrganizationMembers(params) {
  const { Subscriber } = conn.models;

  params = new UpdateGithubOrganizationMembersParams(params);
  const { _id } = params;

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

  subscriber.githubOrganizationMembers = githubOrganizationMembers;

  await subscriber.save();

  return { subscriber };
};