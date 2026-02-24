'use strict';

// Node.js has built-in form-data, but our version of Axios isn't compatible with it
const FormData = require('form-data');
const { IntegrationError } = require('../util/error');
const Vue = require('vue');
const assert = require('assert');
const axios = require('axios');
const { renderToString } = require('vue/server-renderer');

const from = process.env.MAILGUN_FROM_EMAIL;
assert.ok(from);

const domain = process.env.MAILGUN_DOMAIN;
assert.ok(domain);

const privateKey = process.env.MAILGUN_PRIVATE_KEY;
assert.ok(privateKey);

exports.sendEmail = async function sendEmail(params) {
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  let form = null;
  if (params.attachment) {
    form = new FormData();
    for (const [key, value] of Object.entries(params)) {
      form.append(key, value);
    }
  }

  try {
    const { data } = await axios(
      url,
      {
        method: 'post',
        ...(form ? { headers: form.getHeaders(), data: form } : { params }),
        auth: {
          username: 'api',
          password: privateKey
        }
      }
    );
    if (data && data.message) {
      return data.message;
    }
  } catch (error) {
    if (error instanceof axios.AxiosError) {
      throw new IntegrationError(
        `Error sending email: ${error.response.data?.message ?? error.response.data} (status code ${error.response.status})`,
        'mailgun',
        error.response?.status,
        {
          responseData: error.response.data,
          message: error.response.data?.message,
          status: error.response.status,
          params
        }
      );
    }
    throw error;
  }
};
