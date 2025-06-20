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

module.exports = async function stripeWebhook(params, event) {
  try {
    stripe.client.webhooks.constructEvent(event.body, event.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Caught', err);
    throw new Error('Invalid webhook signature');
  }

  const db = await connect();

  const { Workspace } = db.models;

  const { type, data } = new StripeWebhookParams(params);

  if (type === 'checkout.session.completed') {
    const workspaceId = data?.object?.client_reference_id;
    // If no workspace ID provided, create a new workspace with just API key and subscription details
    if (!workspaceId && data?.object?.customer && data?.object?.subscription) {
      // Get customer email from Stripe
      const customer = await stripe.client.customers.retrieve(data.object.customer);
      const customerEmail = customer.email ?? 'Auto-created workspace';

      const newWorkspace = new Workspace({
        name: customerEmail,
        stripeCustomerId: data.object.customer,
        stripeSubscriptionId: data.object.subscription,
        subscriptionTier: 'pro'
      });

      await newWorkspace.save();
      return { workspace: newWorkspace };
    } else {
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
  }

  return {};
};
