
const axios = require('axios');
const config = require('../../.config')
module.exports = ({task, conn}) => async function handleGithubComment(params) {
    const {Subscriber} = conn.models;

    const {comment, issue} = params;
    const orgs = await axios.get(comment.user['organizations_url']).then(res => res.data);
    const orgNames = orgs.map(org => org.login);
    const orgIds = orgs.map(org => org.id);
    const subscriber = await Subscriber.findOne({
      $or: [
        { githubUsername: comment.user.login },
        { githubUserId: comment.user.id.$numberInt },
        { githubOrganization: { $in: orgNames } },
        { githubOrganizationId: { $in: orgIds } },
        { 'githubOrganizationMembers.login': comment.user.login },
        { 'githubOrganizationMembers.id': comment.user.id.$numberInt }
      ]
    });

    if (subscriber == null) {
      return { ok: 1 };
    }
    await task.log('subscriber commented on issue');

    // Send to Slack
    const url = 'https://slack.com/api/chat.postMessage';
    await axios.post(url, {
      channel: '#pro-notifications',
      blocks: [
        {type: 'divider'},
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*COMMENT CREATED ON ISSUE!* \n\n ${comment.user.login} has posted a comment on issue: *${issue.title}*, ${issue.url}`
          }
        },
        {type: 'divider'},
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*DESCRIPTION* \n\n ${comment.body}`
          }
        }, 
      ]
    }, { headers: { authorization: `Bearer ${config.slackToken}` } });
}