'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const SummarizeChatThreadParams = new Archetype({
  authorization: {
    $type: 'string'
  },
  messages: [{
    role: {
      $type: 'string'
    },
    content: {
      $type: 'string'
    }
  }]
}).compile('SummarizeChatThreadParams');

const systemPrompt = 'Summarize the following chat thread in 6 words or less, as a helpful thread title';

module.exports = async function createChatMessage(params) {
  const { authorization, messages } = new SummarizeChatThreadParams(params);

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
    content: systemPrompt
  });
  const res = await getChatCompletion(messages);

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
      model: 'gpt-4o',
      max_tokens: 2500,
      ...options,
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed with status ${response.status}: ${await response.text()}`);
  }

  return await response.json();
}
