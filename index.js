'use strict';

const assert = require('assert');
const cheerio = require('cheerio');
const config = require('./.config');
const express = require('express');
const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true }
});
contentSchema.index({ title: 'text', body: 'text' });
const Content = mongoose.model('Content', contentSchema, 'Content');

run().catch(error => console.error(error.stack));

async function run() {
  const app = express();

  app.use(require('cors')());

  await mongoose.connect(config.uri, { useNewUrlParser: true, dbName: 'mongoose' });

  app.options('*', function(req, res) {
    res.send('');
  });

  app.get('/search', function(req, res) {
    assert.ok(req.query.search);
    console.log(new Date(), req.query.search);
    const $search = req.query.search.toString();
    Content.
      find({ $text: { $search } }, { score: { $meta: 'textScore' } }).
      sort({ score: { $meta: 'textScore' } }).
      limit(10).
      then(
        results => {
          res.json({
            results: results.map(doc => {
              const $ = cheerio.load(doc.body);

              doc.body = $('p').get(0) ? $('p').first().html() : doc.body;

              return doc;
            })
          });
        },
        err => res.status(500).json({ message: err.message })
      );
  });

  app.listen(8080);
  console.log('Listening on 8080');
}
