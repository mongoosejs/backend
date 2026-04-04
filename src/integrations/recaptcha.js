'use strict';

const qs = require('querystring');

const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

exports.verify = async function verify(response, remoteIp) {
  if (!response) {
    return { success: false, score: 0 };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error('RECAPTCHA_SECRET_KEY environment variable is not set');
  }

  const body = qs.stringify({
    secret,
    response,
    remoteip: remoteIp
  });

  const res = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!res.ok) {
    console.log('Error verifying reCAPTCHA', await res.text());
    throw new Error('Failed to verify reCAPTCHA');
  }

  const data = await res.json();

  return data;
};
