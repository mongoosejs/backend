'use strict';

const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true },
  version: { type: String },
  versionNumber: { type: Number }
});

module.exports = contentSchema;
