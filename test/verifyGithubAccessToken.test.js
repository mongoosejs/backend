'use strict';

const assert = require('assert');
const connect = require('../src/db');
const verifyGithubAccessTokenFactory = require('../src/actions/verifyGithubAccessToken');
const { beforeEach, describe, it } = require('mocha');

describe('verifyGithubAccessToken', function() {
  let db, User, AccessToken, verifyGithubAccessToken, user, accessToken;

  beforeEach(async function() {
    db = await connect();
    ({ User, AccessToken } = db.models);
    await User.deleteMany({});
    await AccessToken.deleteMany({});

    user = await User.create({ email: 'test@example.com', githubUsername: 'test', githubUserId: '5678' });
    accessToken = await AccessToken.create({ userId: user._id });

    const task = { sideEffect: async (fn, params) => fn(params) };
    verifyGithubAccessToken = verifyGithubAccessTokenFactory({ task, conn: db });
  });

  it('populates userId when token exists', async function() {
    const res = await verifyGithubAccessToken({ authorization: accessToken._id });
    assert.strictEqual(res.exists, true);
    assert.ok(res.token.userId.githubUsername);
    assert.strictEqual(res.token.userId.githubUsername, 'test');
  });
});
