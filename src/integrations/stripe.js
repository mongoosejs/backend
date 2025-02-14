'use strict';

const assert = require('assert');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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