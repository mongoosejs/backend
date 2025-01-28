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
  }
}, { timestamps: true, id: false });

userSchema.index({ githubUserId: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

module.exports = userSchema;
