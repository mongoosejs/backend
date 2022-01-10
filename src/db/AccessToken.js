'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: () => crypto.randomBytes(36).toString('hex') },
  githubAccessToken: { type: String, required: true },
  githubUserId: { type: String, required: true },
  githubUserName: { type: String, required: true },
  subscriberId: { type: 'ObjectId' }
});

module.exports = accessTokenSchema;