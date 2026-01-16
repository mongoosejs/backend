'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const slack = require('../integrations/slack');

const NotifySlackParams = new Archetype({
  workspaceId: {
    $type: 'string',
    $required: true
  },
  modelName: {
    $type: 'string',
    $required: true
  },
  documentId: {
    $type: 'string',
    $required: true
  },
  purpose: {
    $type: 'string',
    $required: true
  }
}).compile('NotifySlackParams');

module.exports = async function notifySlack(params) {
  const { workspaceId, modelName, documentId, purpose } = new NotifySlackParams(params);

  const db = await connect();
  const { Workspace } = db.models;

  const workspace = await Workspace.findById(workspaceId).orFail();

  if (!workspace.slackWebhooks || workspace.slackWebhooks.length === 0) {
    throw new Error('Workspace does not have any Slack webhook URLs configured');
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `A new document was created in the *${modelName}* model.\n*Document ID:* \`${documentId}\``
      }
    }
  ];

  if (workspace.baseUrl) {
    const url = `${workspace.baseUrl}/model/${modelName}/document/${documentId}`;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${url}|View Document>`
      }
    });
  }

  const messagePayload = {
    blocks
  };

  const matchingWebhooks = workspace.slackWebhooks.filter(webhook => {
    return webhook.enabled !== false && 
           webhook.purposes && 
           webhook.purposes.includes(purpose);
  });

  if (matchingWebhooks.length === 0) {
    throw new Error(`No enabled webhooks found for purpose: ${purpose}`);
  }
  
  await Promise.all(
    matchingWebhooks.map(webhook => slack.sendWebhook(webhook.url, messagePayload))
  );

  return { success: true };
};
