'use strict';

const axios = require('axios');
const config = require('../../.config/development');

const url = 'https://slack.com/api/chat.postMessage';
const emailRegexp = /^[a-zA-Z0-9+._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/;

module.exports = () => async function requestInvite(email) {
  if (!email) {
    return {};
  }
  if (!emailRegexp.test(email)) {
    return {};
  }

  await axios.post(url, {
    channel: '#pro-notifications',
    blocks: [
      {type: 'divider'},
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${email} is requesting access to the mongoosejs workspace`
        }
      },
    ]
  }, { headers: { authorization: `Bearer ${config.slackToken}` } });

  return { success: true };
}