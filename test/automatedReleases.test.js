'use strict';

const assert = require('assert');
const sinon = require('sinon');
const axios = require('axios');
const {getChangelog} = require('../src/getChangelog');
const { createRelease } = require('../src/createRelease');


describe('Automated Releases', function() {
    it('creates a draft release', async function() {
        sinon.stub(axios, 'post').returns({status: 200});
        const changelog = await getChangelog();
        assert.ok(changelog);
        const release = await createRelease(changelog);
        assert.equal(release.status, 200);
    });
});