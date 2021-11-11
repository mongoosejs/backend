'use strict';

const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

module.exports = function azureWrapper(fn) {
  return async function wrappedFunction(context, req) {
    console.log(new Date(), req.method, req.url);
    if (req.method === 'OPTIONS') {
      context.res = JSON.stringify({ ok: 1 });
      return;
    }

    if (isDev && req.body) {
      fs.writeFileSync('./data/' + Date.now() + '.json', JSON.stringify(req.body));
    }

    let res;
    try {
      res = await fn(context, req);
    } catch (err) {
      context.log('Error:', err);
      if (err.name === 'ValidationError') {
        context.res.status = 400;
      } else if (err.status != null) {
        context.res.status = err.status;
      } else {
        context.res.status = 500;
      }
      context.res.body = JSON.stringify({
        message: err.message,
        stack: err.stack
      });
      return;
    }

    context.res.body = JSON.stringify(res);
  };
};