'use strict';

require('dotenv').config();

const cors = require('cors');
const connect = require('./src/db');
const express = require('express');
const fs = require('fs');
const studio = require('@mongoosejs/studio/express');

const app = express();

const netlifyFunctions = fs.readdirSync('./netlify/functions').reduce((obj, path) => {
  obj[path.replace(/\.js$/, '')] = require(`./netlify/functions/${path}`);
  return obj;
}, {});

const topLevelFiles = new Set(
  fs.readdirSync('./public').filter(file => file.endsWith('.html'))
);

app.use('/.netlify/functions', cors(), express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), function netlifyFunctionsMiddleware(req, res) {
  const actionName = req.path.replace(/^\//, '');
  if (!netlifyFunctions.hasOwnProperty(actionName)) {
    throw new Error(`Action ${actionName} not found`);
  }
  const action = netlifyFunctions[actionName];

  const params = {
    headers: req.headers,
    body: JSON.stringify(req.body),
    rawBody: req.rawBody,
    queryStringParameters: req.query
  };
  action.handler(params).
    then(result => {
      if (result.statusCode >= 400) {
        let data = { message: result.body };
        try {
          data = JSON.parse(result.body);
        } catch (err) {}
        return res.status(400).json(data);
      }
      res.json(JSON.parse(result.body));
    }).
    catch(err => {
      res.status(500).json({ message: err.message, stack: err.stack, extra: err.extra });
    });
});

app.use(
  function rewriteUrlForTopLevelFiles(req, res, next) {
    // `extensions: ['html']` mostly works, but doesn't handle the
    // case where there is a directory with the same name as the HTML file.
    // For example, there is both `public/affiliate.html` file and
    // `public/affiliate` directory. Static middleware will go for the
    // directory first. This middleware prevents that.
    if (topLevelFiles.has(req.url.replace(/^\//, '') + '.html')) {
      req.url = req.url + '.html';
    }
    next();
  },
  express.static(
    './public',
    { extensions: ['html'], etag: false, redirect: false }
  )
);

(async function() {
  const db = await connect();
  app.use('/studio', await studio('/studio/api', db));

  app.listen(8888);
  console.log('Listening on port 8888');
})();
