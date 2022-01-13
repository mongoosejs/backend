'use strict';

const assert = require('assert');
const connect = require('../src/db');
const api_webhookGithubSponsors = require('../api_webhookGithubSponsors').rawFunction;

describe('webhookGithubSponsors', function() {
  it('creates a new subscriber doc when a new organization subscribes', async function() {
    const { subscriber } = await api_webhookGithubSponsors(null, {
      body: {
        "action": "created",
        "sponsorship": {
          "sponsor": {
            "login": "org",
            "id": 2,
            "type": "Organization"
          },
          "privacy_level": "public",
          "tier": {
            "name": "Mongoose Pro Subscriber",
            "is_one_time": false,
            "is_custom_amount": false
          }
        },
        "sender": {
          "login": "user",
          "id": 3
        }
      }
    });

    const conn = await connect();
    const Subscriber = conn.model('Subscriber');
    const fromDb = await Subscriber.findById(subscriber);
    assert.equal(fromDb.githubUserId, 3);
    assert.equal(fromDb.githubUsername, 'user');
    assert.equal(fromDb.githubOrganization, 'org');
    assert.equal(fromDb.githubOrganizationId, 2);
  });

  it('creates a new subscriber doc when a new user subscribes', async function() {
    const { subscriber } = await api_webhookGithubSponsors(null, {
      body: {
        "action": "created",
        "sponsorship": {
          "sponsor": {
            "login": "user2",
            "id": 2,
            "type": "User"
          },
          "privacy_level": "public",
          "tier": {
            "name": "Mongoose Pro Subscriber",
            "is_one_time": false,
            "is_custom_amount": false
          }
        },
        "sender": {
          "login": "user",
          "id": 3
        }
      }
    });

    const conn = await connect();
    const Subscriber = conn.model('Subscriber');
    const fromDb = await Subscriber.findById(subscriber);
    assert.equal(fromDb.githubUserId, 3);
    assert.equal(fromDb.githubUsername, 'user');
    assert.ok(!fromDb.githubOrganization);
    assert.ok(!fromDb.githubOrganizationId);
  });
});