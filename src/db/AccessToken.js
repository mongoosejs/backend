'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomBytes(48).toString('hex')
  },
  userId: { type: mongoose.ObjectId, required: true, ref: 'User' },
  expiresAt: {
    type: Date,
    default: function() {
      // Now plus 30 days
      return Date.now() + 1000 * 60 * 60 * 24 * 30;
    }
  }
}, { timestamps: true });

module.exports = accessTokenSchema;
