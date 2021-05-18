'use strict';

const cheerio = require('cheerio');
const config = require('../.config');
const mongoose = require('mongoose');

let conn = null;
const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true }
});
contentSchema.index({ title: 'text', body: 'text' });

module.exports = async function search(context, req) {
  let Content;
  if (conn == null) {
    conn = mongoose.createConnection(config.uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await conn;
  }

  Content = conn.model('Content', contentSchema, 'Content');

  const $search = req.query.search.toString();
  let results = await Content.
    find({ $text: { $search } }, { score: { $meta: 'textScore' } }).
    sort({ score: { $meta: 'textScore' } }).
    limit(10);

  results = results.map(doc => {
    const $ = cheerio.load(doc.body);

    doc.body = $('p').get(0) ? $('p').first().html() : doc.body;

    return doc;
  });

  context.res = {
    // status: 200, /* Defaults to 200 */
    body: JSON.stringify({ results })
  };
}