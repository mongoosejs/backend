'use strict';

exports.handler = async function mongodbKnowledge(event) {
  const params = parseBody(event.body);
  if (!params.input || typeof params.input !== 'string') {
    throw new Error('Missing input');
  }
  const response = await fetch('https://knowledge.mongodb.com/api/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer mongodb-api-key',
      'Content-Type': 'application/json',
      'User-Agent': event.headers['user-agent'] || event.headers['User-Agent'] || 'mongoosejs-docs',
      'X-Request-Origin': event.headers.origin || event.headers.Origin || 'mongoosejs-docs'
    },
    body: JSON.stringify({
      model: 'mongodb-chat-latest',
      stream: true,
      store: true,
      input: [
        {
          role: 'system',
          content: 'Respond to the user\'s question related to the Mongoose ODM documentation'
        },
        {
          role: 'user',
          content: params.input
        }
      ]
    })
  });

  const body = await response.text();

  return {
    statusCode: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'text/event-stream'
    },
    body
  };
};

function parseBody(body) {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (err) {
    return {};
  }
}
