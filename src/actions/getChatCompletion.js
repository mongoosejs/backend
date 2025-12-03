'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const CreateChatMessageParams = new Archetype({
  messages: [{
    role: {
      $type: 'string'
    },
    content: [{
      type: {
        $type: 'string',
        $required: true
      },
      text: {
        $type: 'string'
      }
    }]
  }],
  model: {
    $type: 'string',
    $enum: ['gpt-4o', 'gpt-4.1-nano']
  }
}).compile('CreateChatMessageParams');

module.exports = async function createChatMessage(params) {
  const { messages, model } = new CreateChatMessageParams(params);

  if (!messages) {
    throw new Error('Missing messages');
  }

  const db = await connect();
  const { RateLimit } = db.models;

  await RateLimit.checkRateLimit('openai', 1000);

  const res = await getChatCompletion(messages, { model });

  return {
    response: res.choices?.[0]?.message?.content
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
