'use strict';

const assert = require('assert');
const { beforeEach, describe, it } = require('mocha');
const connect = require('../src/db');
const getWorkspaceTeam = require('../src/actions/getWorkspaceTeam');

describe('getWorkspaceTeam', function() {
  let db, User, AccessToken, Workspace, Invitation;
  let adminUser, adminAccessToken, workspace, invitation1, invitation2;

  beforeEach(async function() {
    db = await connect();
    ({ User, AccessToken, Workspace, Invitation } = db.models);

    await User.deleteMany({});
    await AccessToken.deleteMany({});
    await Workspace.deleteMany({});
    await Invitation.deleteMany({});

    // Create an admin user
    adminUser = await User.create({ email: 'admin@example.com', githubUsername: 'admin' });

    // Create an access token for the admin
    adminAccessToken = await AccessToken.create({ userId: adminUser._id });

    // Create a workspace with the admin user
    workspace = await Workspace.create({
      name: 'Test Workspace',
      ownerId: adminUser._id,
      members: [{ userId: adminUser._id, roles: ['owner'] }],
      baseUrl: 'https://example.com',
      subscriptionTier: 'pro'
    });

    // Create invitations with "pending" and "declined" statuses
    invitation1 = await Invitation.create({
      workspaceId: workspace._id,
      githubUsername: 'user1',
      status: 'pending',
      invitedBy: adminUser._id,
      roles: ['member']
    });

    invitation2 = await Invitation.create({
      workspaceId: workspace._id,
      githubUsername: 'user2',
      status: 'declined',
      invitedBy: adminUser._id,
      roles: ['admin']
    });
  });

  it('should return pending and declined invitations if user is an admin or owner', async function() {
    const result = await getWorkspaceTeam({
      authorization: adminAccessToken._id.toString(),
      workspaceId: workspace._id
    });

    assert.strictEqual(result.invitations.length, 2);
    assert.strictEqual(result.invitations[0].workspaceId.toString(), workspace._id.toString());
    assert.strictEqual(result.invitations[1].workspaceId.toString(), workspace._id.toString());
    assert.deepStrictEqual(
      result.invitations.map(invite => invite.status).sort(),
      ['declined', 'pending']
    );
  });
});
