'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const CreateChatMessageParams = new Archetype({
  authorization: {
    $type: 'string',
    $required: true
  },
  messages: [{
    role: {
      $type: 'string'
    },
    content: {
      $type: 'string'
    }
  }]
}).compile('CreateChatMessageParams');

module.exports = async function createChatMessage(params) {
  const { authorization, messages } = new CreateChatMessageParams(params);

  const db = await connect();
  const { AccessToken, RateLimit, User } = db.models;

  await RateLimit.checkRateLimit('openai', 2);

  // Find the user linked to the access token
  const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid access token'));
  const userId = accessToken.userId;

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

  return await response.json();
}
