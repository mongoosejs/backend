'use strict';

const axios = require('axios');
const config = require('../../.config');
const { createTokenAuth } = require('@octokit/auth-token');

const host = 'https://api.github.com';

module.exports = {
    async createMessage(jobs) {
    const { token } = await createTokenAuth(config.githubAccessTokenForMongoose)();
    const url = 'https://slack.com/api/chat.postMessage';
    // Send to Slack
    let company = '';
    let jobTitle = '';
    if (Array.isArray(jobs)) {
        company = jobs[0].company;
        jobTitle = jobs.map(entry => {
            entry.title;
        });
        await axios.post(url, {
            channel: '#pro-notifications',
            blocks: [
              {type: 'divider'},
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Job Updated!* \n\n ${company} has updated the following job`
                }
              },
              {type: 'divider'},
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Job:* \n\n ${jobTitle.join(',')}`
                }
              }, 
            ]
          }, { headers: { authorization: `Bearer ${config.slackToken}` } });
    } else {
        company = jobs.company;
        jobTitle = jobs.title;
        await axios.post(url, {
            channel: '#pro-notifications',
            blocks: [
              {type: 'divider'},
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Job Updated!* \n\n ${company} has updated the following job`
                }
              },
              {type: 'divider'},
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Job:* \n\n ${jobTitle}`
                }
              }, 
            ]
          }, { headers: { authorization: `Bearer ${config.slackToken}` } });
    }
    }
}