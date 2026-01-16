'use strict';

const axios = require('axios');
const config = require('../../.config');

module.exports = {
  async sendMessage(jobs) {
    const url = 'https://slack.com/api/chat.postMessage';
    // Send to Slack
    await axios.post(url, jobs, { headers: { authorization: `Bearer ${config.slackToken}` } });
  },
  async sendWebhook(webhookUrl, payload) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook request failed with status ${response.status}`);
    }

    return response;
  }
};