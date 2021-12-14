'use strict';

const assert = require('assert');
const sinon = require('sinon');
const githubOAuth = require('../src/integrations/githubOAuth');
const createReleaseFromChangelog = require('../src/actions/createReleaseFromChangelog');

const changelog = `
6.1.1 / 2021-12-09
==================
 * fix(document): allow setting nested path to instance of document #11011
`.trim();

describe('createReleaseFromChangelog', function() {
  it('creates a draft release', async function() {
    sinon.stub(githubOAuth, 'getChangelog').callsFake(() => Promise.resolve(changelog));
    sinon.stub(githubOAuth, 'createRelease').callsFake(() => Promise.resolve());
    await createReleaseFromChangelog();

    const [tagAndName, body] = githubOAuth.createRelease.getCall(0).args;
    assert.equal(tagAndName, '6.1.1');
    assert.equal(body, changelog);
  });
});