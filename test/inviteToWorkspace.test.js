'use strict';

const { afterEach, beforeEach, describe, it } = require('mocha');
const assert = require('assert');
const connect = require('../src/db');
const inviteToWorkspace = require('../src/actions/inviteToWorkspace');

describe('inviteToWorkspace', function() {
  let db, AccessToken, User, Workspace, Invitation;
  let user, workspace, accessToken;

  beforeEach(async function() {
    // Connect to the real database
    db = await connect();
    ({ AccessToken, User, Workspace, Invitation } = db.models);

    await AccessToken.deleteMany({});
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Invitation.deleteMany({});

    user = await User.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      githubUsername: 'johndoe',
      githubUserId: '1234'
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
      members: [{ userId: user._id, roles: ['owner'] }],
      subscriptionTier: 'pro'
    });
  });

  afterEach(async function() {
    // Cleanup after tests
    await AccessToken.deleteMany({});
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Invitation.deleteMany({});
  });

  it('should invite a user successfully', async function() {
    const result = await inviteToWorkspace({
      authorization: accessToken._id.toString(),
      workspaceId: workspace._id,
      githubUsername: 'janesmith',
      roles: ['member']
    });

    assert.strictEqual(result.invitation.githubUsername, 'janesmith');
    assert.strictEqual(result.invitation.status, 'pending');
    assert.deepStrictEqual(result.invitation.roles, ['member']);

    const invitationInDb = await Invitation.findOne({ githubUsername: 'janesmith' });
    assert.ok(invitationInDb, 'Invitation should be saved in the database');
    assert.strictEqual(invitationInDb.invitedBy.toString(), user._id.toString());
    assert.strictEqual(invitationInDb.workspaceId.toString(), workspace._id.toString());
  });


  it('should fail if user is already a member of the workspace', async function() {
    const invitedUser = await User.create({
      name: 'Jane Smith',
      email: 'janesmith@example.com',
      githubUsername: 'janesmith',
      githubUserId: '5678'
    });

    // Add the user directly as a member of the workspace
    await Workspace.findByIdAndUpdate(workspace._id, {
      $push: { members: { userId: invitedUser._id, roles: ['member'] } }
    });

    await assert.rejects(
      inviteToWorkspace({
        authorization: accessToken._id.toString(),
        workspaceId: workspace._id,
        githubUsername: 'janesmith',
        roles: ['member']
      }),
      /janesmith is already a member of this workspace/
    );
  });
});
