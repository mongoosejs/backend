'use strict';

const assert = require('assert');
const connect = require('../src/db');
const { afterEach, beforeEach, describe, it } = require('mocha');
const mailgun = require('../src/integrations/mailgun');
const sinon = require('sinon');
const stripe = require('../src/integrations/stripe');
const stripeWebhook = require('../src/actions/stripeWebhook');

describe('stripeWebhook', function() {
  let db;
  let Workspace;

  beforeEach(async function() {
    db = await connect();
    ({ Workspace } = db.models);
    await Workspace.deleteMany({});
  });

  afterEach(function() {
    sinon.restore();
  });

  it('creates a workspace, rotates api key, and sends setup email for checkout without workspaceId', async function() {
    sinon.stub(stripe.client.webhooks, 'constructEvent').returns({});
    sinon.stub(stripe.client.customers, 'retrieve').resolves({ email: 'customer@example.com' });
    const sendEmailStub = sinon.stub(mailgun, 'sendEmail').resolves('Queued');

    const res = await stripeWebhook(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_123',
            subscription: 'sub_123'
          }
        }
      },
      { body: '{}', headers: { 'stripe-signature': 'sig_123' } }
    );

    assert.ok(res.workspace);
    assert.ok(/^[a-z]+-[a-z]+$/.test(res.workspace.name), `expected slug name, got "${res.workspace.name}"`);
    assert.equal(res.workspace.stripeCustomerEmail, 'customer@example.com');
    assert.equal(res.workspace.stripeCustomerId, 'cus_123');
    assert.equal(res.workspace.stripeSubscriptionId, 'sub_123');
    assert.equal(res.workspace.subscriptionTier, 'pro');
    assert.ok(/^[a-f0-9]{96}$/.test(res.workspace.apiKey), 'expected hex api key');

    assert.equal(sendEmailStub.callCount, 1);
    const emailParams = sendEmailStub.firstCall.args[0];
    assert.equal(emailParams.to, 'customer@example.com');
    assert.ok(
      /^Set up your Mongoose Studio/.test(emailParams.subject),
      `unexpected email subject "${emailParams.subject}"`
    );
    assert.ok(!emailParams.html.includes(res.workspace.apiKey));
    assert.ok(emailParams.html.includes(`workspaceId=${res.workspace._id}`));
  });

  it('updates existing workspace and rotates api key', async function() {
    sinon.stub(stripe.client.webhooks, 'constructEvent').returns({});
    sinon.stub(stripe.client.customers, 'retrieve').resolves({ email: 'owner@example.com' });
    const sendEmailStub = sinon.stub(mailgun, 'sendEmail').resolves('Queued');

    const workspace = await Workspace.create({
      name: 'existing-workspace',
      apiKey: 'a'.repeat(96),
      subscriptionTier: 'free',
      members: []
    });

    const res = await stripeWebhook(
      {
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: workspace._id.toString(),
            customer: 'cus_456',
            subscription: 'sub_456'
          }
        }
      },
      { body: '{}', headers: { 'stripe-signature': 'sig_456' } }
    );

    assert.ok(res.workspace);
    assert.equal(res.workspace._id.toString(), workspace._id.toString());
    assert.equal(res.workspace.subscriptionTier, 'pro');
    assert.equal(res.workspace.stripeCustomerId, 'cus_456');
    assert.equal(res.workspace.stripeSubscriptionId, 'sub_456');
    assert.equal(res.workspace.stripeCustomerEmail, 'owner@example.com');
    assert.notEqual(res.workspace.apiKey, 'a'.repeat(96));
    assert.ok(/^[a-f0-9]{96}$/.test(res.workspace.apiKey), 'expected rotated hex api key');
    assert.equal(sendEmailStub.callCount, 1);
  });
});
