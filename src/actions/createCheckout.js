'use strict';

const Archetype = require('archetype');
const recaptcha = require('../integrations/recaptcha');
const stripe = require('../integrations/stripe');

const CreateCheckoutParams = new Archetype({
  name: {
    $type: 'string',
    $required: true
  },
  email: {
    $type: 'string',
    $required: true
  },
  plan: {
    $type: 'string',
    $required: true,
    $enum: ['solo', 'pro']
  },
  website: {
    $type: 'string'
  },
  response: {
    $type: 'string'
  }
}).compile('CreateCheckoutParams');

const priceIds = {
  solo: process.env.STRIPE_SOLO_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID
};

module.exports = async function createCheckout(params) {
  const { name, email, plan, website, response } = new CreateCheckoutParams(params);

  if (website) {
    throw new Error('This request was flagged as spam. If this is an error, please refresh and try again.');
  }

  const recaptchaResult = await recaptcha.verify(response);
  console.log(recaptchaResult);
  if (!recaptchaResult.success || recaptchaResult.score < 0.7 || recaptchaResult.action !== 'checkout') {
    throw new Error('Captcha verification failed');
  }

  const priceId = priceIds[plan];
  if (!priceId) {
    throw new Error('Price not configured for plan: ' + plan);
  }

  const returnUrl = (process.env.PUBLIC_APP_BASE_URL || 'https://studio.mongoosejs.io') + '/my-account.html';

  const session = await stripe.client.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: returnUrl,
    metadata: { name, plan }
  });

  return { clientSecret: session.client_secret };
};
