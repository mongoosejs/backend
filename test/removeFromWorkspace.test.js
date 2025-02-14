'use strict';

const { afterEach, beforeEach, describe, it } = require('mocha');
const assert = require('assert');
const connect = require('../src/db');
const removeFromWorkspace = require('../src/actions/removeFromWorkspace');

describe('removeFromWorkspace', function() {
  let db, AccessToken, User, Workspace;
  let user, workspace, accessToken, memberUser;

  beforeEach(async function() {
    db = await connect();
    ({ AccessToken, User, Workspace } = db.models);

    await AccessToken.deleteMany({});
    await User.deleteMany({});
    await Workspace.deleteMany({});

    user = await User.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      githubUsername: 'johndoe',
      githubUserId: '1234'
    });

    memberUser = await User.create({
      name: 'Jane Smith',
      email: 'janesmith@example.com',
      githubUsername: 'janesmith',
      githubUserId: '5678'
    });

    accessToken = await AccessToken.create({
      userId: user._id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days valid
    });

    workspace = await Workspace.create({
      name: 'Test Workspace',
      ownerId: user._id,
      apiKey: 'test-api-key',
      baseUrl: 'https://example.com',
      members: [
        { userId: user._id, roles: ['owner'] },
        { userId: memberUser._id, roles: ['member'] }
      ],
      subscriptionTier: 'pro'
    });
  });

  afterEach(async function() {
    await AccessToken.deleteMany({});
    await User.deleteMany({});
    await Workspace.deleteMany({});
  });

  it('should remove a member from workspace successfully', async function() {
    const result = await removeFromWorkspace({
      authorization: accessToken._id.toString(),
      workspaceId: workspace._id,
      userId: memberUser._id
    });

    assert.ok(result.workspace);
    assert.strictEqual(result.workspace.members.length, 1);
    assert.strictEqual(result.workspace.members[0].userId.toString(), user._id.toString());

    const workspaceInDb = await Workspace.findById(workspace._id);
    assert.strictEqual(workspaceInDb.members.length, 1);
    assert.strictEqual(workspaceInDb.members[0].userId.toString(), user._id.toString());
  });
});
