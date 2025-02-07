'use strict';

const Archetype = require('archetype');
const cheerio = require('cheerio');
const extrovert = require('extrovert');
const mongoose = require('mongoose');

let conn = null;
const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true },
  version: { type: String },
  versionNumber: { type: Number }
});

const SearchParams = new Archetype({
  version: {
    $type: 'string'
  },
  search: {
    $type: 'string',
    $required: true
  }
}).compile('SearchParams');

const uri = process.env.MONGODB_CONNECTION_STRING;

module.exports = extrovert.toNetlifyFunction(async function search(params) {
  params = new SearchParams(params);
  if (conn == null) {
    conn = mongoose.createConnection(uri);
    await conn.asPromise();
  }

  const Content = conn.model('Content', contentSchema, 'Content');

  const query = params.search;
  const version = params.version ? +params.version.replace(/\.x$/, '') : null;
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

  return { results };
});
