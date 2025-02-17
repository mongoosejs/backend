'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const connect = require('../../src/db');
const mongoose = require('mongoose');
const stripe = require('../integrations/stripe');

const StripeWebhookParams = new Archetype({
  type: {
    $type: 'string'
  },
  data: {
    object: {
      client_reference_id: {
        $type: 'string'
      },
      customer: {
        $type: 'string'
      },
      subscription: {
        $type: 'string'
      }
    }
  }
}).compile('StripeWebhookParams');

module.exports = async function stripeWebhook(params, req) {
  console.log('AB', req, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  try {
    stripe.client.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Caught', err);
    throw new Error('Invalid webhook signature');
  }

  const db = await connect();

  const { Workspace } = db.models;

  const { type, data } = new StripeWebhookParams(params);

  if (type === 'checkout.session.completed') {
    const workspaceId = data?.object?.client_reference_id;
    assert.ok(workspaceId, 'no workspace id found');
    const workspace = await Workspace.findById(workspaceId).orFail();
    assert.ok(!workspace.stripeSubscriptionId, 'workspace already has a subscription');
    assert.ok(data.object.customer, 'no customer found in webhook');
    assert.ok(data.object.subscription, 'no subscription found in webhook');

    workspace.stripeCustomerId = data.object.customer;
    workspace.stripeSubscriptionId = data.object.subscription;
    workspace.subscriptionTier = 'pro';
    await workspace.save();

    return { workspace };
  }

  return {};
};
