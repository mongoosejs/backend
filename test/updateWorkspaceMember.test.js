'use strict';

const { afterEach, beforeEach, describe, it } = require('mocha');
const assert = require('assert');
const connect = require('../src/db');
const updateWorkspaceMember = require('../src/actions/updateWorkspaceMember');

describe('updateWorkspaceMember', function() {
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
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
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

  it('updates the role of a workspace member', async function() {
    const result = await updateWorkspaceMember({
      authorization: accessToken._id.toString(),
      workspaceId: workspace._id,
      userId: memberUser._id,
      role: 'admin'
    });

    assert.ok(result.workspace);

    const updatedMember = result.workspace.members.find(member => member.userId.toString() === memberUser._id.toString());
    assert.deepStrictEqual(updatedMember.roles, ['admin']);

    const workspaceInDb = await Workspace.findById(workspace._id);
    const updatedMemberInDb = workspaceInDb.members.find(member => member.userId.toString() === memberUser._id.toString());
    assert.deepStrictEqual(updatedMemberInDb.roles, ['admin']);
  });
});
