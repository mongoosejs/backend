const axios = require('axios');
const config = require('../../.config/development');

module.exports = ({task, conn}) => async function requestInvite(email) {

    const url = 'https://slack.com/api/chat.postMessage';
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
}

requestInvite('test@localhost.com');