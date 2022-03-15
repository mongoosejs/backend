'use strict';

const axios = require('axios');
const config = require('../../.config');

module.exports = {
    async sendMessage(payload) {
    const url = 'https://slack.com/api/chat.postMessage';
    // Send to Slack
    return await axios.post(url, payload, { headers: { authorization: `Bearer ${config.slackToken}` } });
    }
}