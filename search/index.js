'use strict';

const cheerio = require('cheerio');
const config = require('../.config');
const mongoose = require('mongoose');

let conn = null;
const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true },
  version: { type: String }
});
contentSchema.index({ title: 'text', body: 'text' });

module.exports = async function search(context, req) {
  let Content;
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }

  Content = conn.model('Content', contentSchema, 'Content');

  const $search = req.query.search.toString();
  const version = req.query.version;
  const filter = { $text: { $search } };
  if (version) {
    filter.version = version;
  }
  let results = await Content.
    find(filter, { score: { $meta: 'textScore' } }).
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