'use strict';

const assert = require('assert');
const sinon = require('sinon');
const changelog = require('../src/getChangelog');
const release = require('../src/createRelease');
const {createReleaseFromChangelog} = require('../githubReleaseScript.js');


describe('Automated Releases', function() {
    it('creates a draft release', async function() {
      sinon.stub(changelog, 'getChangelog');
      sinon.stub(release, 'createRelease');
      const result = await createReleaseFromChangelog();
      assert.ok(result);
    });
});