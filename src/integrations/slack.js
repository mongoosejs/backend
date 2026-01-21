'use strict';

const axios = require('axios');
const config = require('../../config');

module.exports = {
  async sendMessage(jobs) {
    const url = 'https://slack.com/api/chat.postMessage';
    // Send to Slack
    await axios.post(url, jobs, { headers: { authorization: `Bearer ${config.slackToken}` } });
  }
};
