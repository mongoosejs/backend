'use strict';

const mongoose = require('mongoose');

module.exports = mongoose.Schema({
  openCollectiveId: {
    type: Number,
    required: true
  },
  website: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  alt: {
    type: String
  }
}, { timestamps: true });
