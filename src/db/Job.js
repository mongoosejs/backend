'use strict';

const mongoose = require('mongoose');

module.exports = mongoose.Schema({
  logo: {
    type: String
  },
  company: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  }
}, { timestamps: true });