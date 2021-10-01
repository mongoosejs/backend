const azureWrapper = require('../util/azureWrapper');

const axios = require('axios');




module.exports = azureWrapper(async function slackNotifications(context, req) {
    // we need issue.title, issue.body, issue.user.login
    // could get their profile pic and so on if I wanted. 
    const {issue} = req.body;
    const url = 'https://slack.com/api/chat.postMessage';
    const res = await axios.post(url, {
      channel: '#pro-notifications',
      blocks: [
        {type: 'divider'},
        {type: 'divider'},
        {type: 'divider'},
        {type: 'divider'},
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*NEW ISSUE CREATED!* \n\n ${issue.user.login} has posted an issue titled: ${issue.title}`
            }
        }, {type: 'divider'},
          {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*DESCRIPTION* \n\n ${issue.body}`
          }
        }, 
      ]
    }, { headers: { authorization: `Bearer ${slackToken}` } });
  
    console.log('Done', res.data);
    return true;
});





