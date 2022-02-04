'use strict';

const TaskSchema = require('../src/db/task');
const assert = require('assert');
const sinon = require('sinon');
const githubOAuth = require('../src/integrations/githubOAuth');
const updateSubscriber = require('../src/actions/updateSubscriber');

describe('updateSubscriber', function() {
  let Task;
  let task;
  before(() => {
    Task = conn.model('Task', TaskSchema);
  });

  beforeEach(async function() {
    task = await Task.create({});
  });

  afterEach(() => sinon.restore());

  it('handles updating basic properties', async function() {
    const { AccessToken, Subscriber } = conn.models;

    const subscriber = await Subscriber.create({
      githubUsername: 'vkarpov15',
      githubUserId: 'test'
    });

    const token = await AccessToken.create({
      githubAccessToken: 'test',
      githubUserName: 'vkarpov15',
      githubUserId: 'test',
      subscriberId: subscriber._id
    });

    const res = await updateSubscriber({ task, conn })({
      _id: subscriber._id,
      authorization: token._id,
      companyName: 'Acme'
    });

    assert.equal(res.subscriber.companyName, 'Acme');
    const fromDb = await Subscriber.findById(subscriber);
    assert.equal(fromDb.companyName, 'Acme');
  });

  it('updates organization id when updating org name', async function() {
    const { AccessToken, Subscriber } = conn.models;

    const subscriber = await Subscriber.create({
      githubUsername: 'vkarpov15',
      githubUserId: 'test'
    });

    const token = await AccessToken.create({
      githubAccessToken: 'test',
      githubUserName: 'vkarpov15',
      githubUserId: 'test',
      subscriberId: subscriber._id
    });

    sinon.stub(githubOAuth, 'getOrganizationId').callsFake(() => Promise.resolve('fake org id'));

    const res = await updateSubscriber({ task, conn })({
      _id: subscriber._id,
      authorization: token._id,
      githubOrganization: 'Acme Dev'
    });

    assert.equal(res.subscriber.githubOrganization, 'Acme Dev');
    assert.equal(res.subscriber.githubOrganizationId, 'fake org id');
  });
});