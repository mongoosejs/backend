'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const cheerio = require('cheerio');
const connect = require('../../src/db');
const crypto = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');
const mailgun = require('../integrations/mailgun');
const path = require('path');
const { generateSlug } = require('random-word-slugs');
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

const newWorkspaceTemplate = fs.readFileSync(path.resolve(__dirname, '..', 'emailTemplates', 'newWorkspace.html'), 'utf8');

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
    const stripeCustomerId = data?.object?.customer;
    const stripeSubscriptionId = data?.object?.subscription;
    assert.ok(stripeCustomerId, 'no customer found in webhook');
    assert.ok(stripeSubscriptionId, 'no subscription found in webhook');

    const customer = await stripe.client.customers.retrieve(stripeCustomerId);
    const customerEmail = customer?.email?.toLowerCase?.() ?? null;
    const newApiKey = crypto.randomBytes(48).toString('hex');
    const publicAppBaseUrl = process.env.MONGOOSE_STUDIO_PUBLIC_URL ||
      new URL(process.env.GITHUB_REDIRECT_URI || process.env.GOOGLE_OAUTH_CALLBACK_URL).origin;
    const randomWorkspaceName = generateSlug(2, { format: 'kebab' });

    // If no workspace ID provided, create a new workspace with just API key and subscription details
    if (!workspaceId) {
      const newWorkspace = new Workspace({
        name: randomWorkspaceName,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionTier: 'pro',
        stripeCustomerEmail: customerEmail,
        apiKey: newApiKey
      });

      await newWorkspace.save();
      if (customerEmail) {
        const setupUrl = new URL('/login.html', publicAppBaseUrl);
        setupUrl.searchParams.set('workspaceId', newWorkspace._id.toString());
        const $ = cheerio.load(newWorkspaceTemplate);
        $('#workspace-name').text(newWorkspace.name);
        $('#setup-link').attr('href', setupUrl.toString()).text(setupUrl.toString());
        await mailgun.sendEmail({
          to: customerEmail,
          from: process.env.MAILGUN_FROM_EMAIL,
          subject: 'Set up your Mongoose Studio Workspace',
          html: $.html()
        });
      }
      return { workspace: newWorkspace };
    } else {
      const workspace = await Workspace.findById(workspaceId).orFail();
      assert.ok(!workspace.stripeSubscriptionId, 'workspace already has a subscription');

      workspace.stripeCustomerId = stripeCustomerId;
      workspace.stripeSubscriptionId = stripeSubscriptionId;
      workspace.subscriptionTier = 'pro';
      workspace.apiKey = newApiKey;
      if (workspace.members.length === 0 && customerEmail) {
        workspace.stripeCustomerEmail = customerEmail;
      }
      await workspace.save();
      if (customerEmail) {
        const setupUrl = new URL('/login.html', publicAppBaseUrl);
        setupUrl.searchParams.set('workspaceId', workspace._id.toString());
        const $ = cheerio.load(newWorkspaceTemplate);
        $('#workspace-name').text(workspace.name || randomWorkspaceName);
        $('#setup-link').attr('href', setupUrl.toString()).text(setupUrl.toString());
        await mailgun.sendEmail({
          to: customerEmail,
          from: process.env.MAILGUN_FROM_EMAIL,
          subject: 'Set up your Mongoose Studio account',
          html: $.html()
        });
      }

      return { workspace };
    }
  }

  return {};
};
