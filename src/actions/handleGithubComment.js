

const slack = require('../integrations/slack');

module.exports = ({task, conn}) => async function handleGithubComment(params) {
    const {Subscriber} = conn.models;

    const {comment, issue} = params;
    const subscriber = await Subscriber.findOne({
      $or: [
        { githubUsername: comment.user.login },
        { githubUserId: comment.user.id.$numberInt },
        { 'githubOrganizationMembers.login': comment.user.login },
        { 'githubOrganizationMembers.id': comment.user.id.$numberInt }
      ]
    });
    // console.log(params);
    if (subscriber == null) {
      return { ok: 1 };
    }
    await task.log('subscriber commented on issue');

    // Send to Slack
    const details = {
      channel: '#pro-notifications',
      blocks: [
        {type: 'divider'},
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*COMMENT CREATED ON ISSUE!* \n\n ${comment.user.login} has posted a comment on issue: *${issue.title}*, ${issue.html_url}`
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
    }
    return await slack.sendMessage(details);
}