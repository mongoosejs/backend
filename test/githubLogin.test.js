'use strict';

const assert = require('assert');
const connect = require('../src/db');
const sinon = require('sinon');
const githubOAuth = require('../src/integrations/githubOAuth');
const githubLogin = require('../api_githubLogin').rawFunction;

describe('githubLogin', function() {
  it('handles logging in', async function() {
    sinon.stub(githubOAuth, 'getAccessToken').callsFake(() => Promise.resolve({ access_token: '1234' }));
    sinon.stub(githubOAuth, 'getUserFromToken').callsFake(() => Promise.resolve({
      login: 'vkarpov15',
      id: 'testid'
    }));
    const { token } = await githubLogin(null, { query: { code: 'testcode' } });

    assert.ok(githubOAuth.getAccessToken.calledOnceWith('testcode'));
    assert.ok(githubOAuth.getUserFromToken.calledOnceWith('1234'));

    const conn = await connect();
    const AccessToken = conn.model('AccessToken');
    const fromDb = await AccessToken.findOne({ _id: token });
    assert.equal(fromDb.githubUserId, 'testid');
    assert.equal(fromDb.githubUserName, 'vkarpov15');
  });
});