'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const slack = require('../integrations/slack');

const NotifySlackPayload = new Archetype({
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
}).compile('NotifySlackPayload');

module.exports = async function notifySlack(params) {
  const db = await connect();
  const { Workspace } = db.models;

  const workspace = await Workspace.findById(params.workspaceId).orFail();

  if (!workspace.slackWebhooks || workspace.slackWebhooks.length === 0) {
    throw new Error('Workspace does not have any Slack webhook URLs configured');
  }

  const { modelName, documentId, purpose } = new NotifySlackPayload(params.payload || {});

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
