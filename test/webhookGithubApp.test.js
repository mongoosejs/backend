'use strict';

const assert = require('assert');
const connect = require('../src/db');
const githubApp = require('../src/integrations/githubApp');
const sinon = require('sinon');
const webhookGithubApp = require('../webhookGithubApp').rawFunction;

describe('webhookGithubApp', function() {
  let conn;
  let Subscriber;

  before(async function() {
    conn = await connect();

    Subscriber = conn.model('Subscriber');
  });

  beforeEach(() => conn.dropDatabase());

  it('works', async function() {
    await Subscriber.create({
      email: 'val@karpov.io',
      githubUsername: 'vkarpov15',
      githubUserId: '1234',
      githubOrganization: 'mastering-js'
    });

    const body = {
      "action": "created",
      "installation": {
        "id": 20657751,
        "account": {
          "login": "mastering-js",
          "id": 69875997,
          "type": "Organization"
        },
        "target_type": "Organization",
        "permissions": {
          "members": "read",
          "organization_events": "read"
        },
        "events": [
          "organization"
        ],
      },
      "repositories": [],
      "requester": null,
      "sender": {
        "login": "vkarpov15",
        "id": 1620265,
        "type": "User",
        "site_admin": false
      }
    };

    sinon.stub(githubApp, 'getOrganizationMembers').callsFake(() => Promise.resolve([
      { login: 'vkarpov15', id: '1234', avatar_url: 'dog1.jpg' },
      { login: 'IslandRhythms', id: '5678', avatar_url: 'dog2.jpg' }
    ]));

    const res = await webhookGithubApp(null, { body });
    assert.ok(res.ok);

    const sub = await Subscriber.findOne({ githubOrganization: 'mastering-js' });
    assert.ok(sub);
    assert.equal(sub.installationId, 20657751);
    assert.deepEqual(sub.githubOrganizationMembers.toObject(), [
      { login: 'vkarpov15', id: '1234', avatar: 'dog1.jpg' },
      { login: 'IslandRhythms', id: '5678', avatar: 'dog2.jpg' }
    ]);
  });
});