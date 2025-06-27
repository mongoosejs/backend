'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  picture: {
    type: String
  },
  githubUsername: {
    type: String
  },
  githubUserId: {
    type: String
  },
  googleUserId: {
    type: String
  },
  isFreeUser: {
    type: Boolean
  }
}, { timestamps: true, id: false });

userSchema.post('validate', function() {
  if (!this.githubUserId && !this.googleUserId) {
    throw new Error('Either githubUserId or googleUserId must be set.')
  }
});

userSchema.index({ githubUserId: 1 }, { unique: true, sparse: true });
userSchema.index({ googleUserId: 1 }, { unique: true, sparse: true });

module.exports = userSchema;
