'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const CreateChatMessageParams = new Archetype({
  authorization: {
    $type: 'string'
  },
  modelDescriptions: {
    $type: 'string'
  },
  messages: [{
    role: {
      $type: 'string'
    },
    content: {
      $type: 'string'
    }
  }],
  model: {
    $type: 'string',
    $enum: ['gpt-4o', 'gpt-4.1-nano']
  }
}).compile('CreateChatMessageParams');

const systemPrompt = `
You are a data querying assistant who writes scripts for users accessing MongoDB data using Node.js and Mongoose.

Keep scripts concise. Avoid unnecessary comments, error handling, and temporary variables.

Do not write any imports or require() statements, that will cause the script to break.

If the user approves the script, the script will run in the Node.js server and then send the response via JSON to the client. Be aware that the result of the query will be serialized to JSON before being displayed to the user.

Assume the user has pre-defined schemas and models. Do not define any new schemas or models for the user.

Use async/await where possible. Assume top-level await is allowed.

Write at most one script, unless the user explicitly asks for multiple scripts.

Think carefully about the user's input and identify the models referred to by the user's query.

Format output as Markdown, including code fences for any scripts the user requested.

Add a brief text description of what the script does.

If the user's query is best answered with a chart, return a Chart.js 4 configuration as \`return { $chart: chartJSConfig };\`. Disable ChartJS animation by default unless user asks for it. Set responsive: true, maintainAspectRatio: false options unless the user explicitly asks.

Example output:

The following script counts the number of users which are not deleted.

\`\`\`javascript
const users = await db.model('User').find({ isDeleted: false });
return { numUsers: users.length };
\`\`\`

-----------

Here is a description of the user's models. Assume these are the only models available in the system unless explicitly instructed otherwise by the user.
`.trim();

module.exports = async function createChatMessage(params) {
  const { authorization, modelDescriptions, messages, model } = new CreateChatMessageParams(params);

  const db = await connect();
  const { AccessToken, RateLimit } = db.models;

  let userId = null;
  if (authorization) {
    const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid access token'));
    userId = accessToken.userId;
  }

  await RateLimit.checkRateLimit('openai', 1000);

  messages.unshift({
    role: 'system',
    content: systemPrompt + (modelDescriptions ?? '')
  });
  const res = await getChatCompletion(messages, { model });

  return {
    response: res.choices?.[0]?.message?.content,
    userId
  };
};

async function getChatCompletion(messages, options = {}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      max_tokens: 2500,
      ...options,
      model: options?.model || 'gpt-4o',
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed with status ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}
