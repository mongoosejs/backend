'use strict';

const cheerio = require('cheerio');
const config = require('../.config');
const mongoose = require('mongoose');

let conn = null;
const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true },
  version: { type: String },
  versionNumber: { type: Number }
});

module.exports = async function search(context, req) {
  let Content;
  if (conn == null) {
    conn = mongoose.createConnection(config.uri);
    await conn.asPromise();
  }

  Content = conn.model('Content', contentSchema, 'Content');

  const query = req.query.search.toString();
  const version = req.query.version ? +req.query.version.replace(/\.x$/, '') : null;
  let results = await Content.aggregate([
    {
      $search: {
        index: 'mongoose-content',
        compound: {
          must: [
            ...(version ? [{
              equals: {
                path: 'versionNumber',
                value: version
              }
            }] : []),
            { text: { query, path: { wildcard: '*' }, fuzzy: {} } }
          ]
        }
      }
    },
    { $limit: 10 }
  ]);

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