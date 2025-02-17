'use strict';

const assert = require('assert');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.client = stripe;

exports.listSubscriptions = async function listSubscriptions() {
  const subscriptions = await stripe.subscriptions.list();
  return subscriptions;
};

exports.getSubscription = async function getSubscription(subscriptionId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
};

exports.updateSubscriptionSeats = async function updateSubscriptionSeats(subscriptionId, newSeatCount) {
  assert(Number.isInteger(newSeatCount) && newSeatCount >= 0, 'Seat count must be a non-negative integer.');

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0].id;

  const updatedSubscription = await stripe.subscriptionItems.update(
    subscriptionItemId,
    { quantity: newSeatCount }
  );

  return updatedSubscription;
};

exports.createCustomerPortalLink = async function createCustomerPortalLink(customerId, returnUrl) {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl // URL to redirect the user back after they leave the portal
  });

  return portalSession.url; // This is the link to the customer portal
};
