'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String
  },
  ownerId: {
    type: 'ObjectId',
    ref: 'User',
    required: true
  },
  apiKey: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(48).toString('hex')
  },
  members: [{
    _id: false,
    userId: {
      type: 'ObjectId',
      ref: 'User',
      required: true
    },
    roles: [{
      type: String,
      required: true,
      enum: ['owner', 'admin', 'member', 'readonly', 'dashboards']
    }]
  }],
  baseUrl: {
    type: String,
    required: true
  },
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true
  },
  subscriptionTier: {
    type: String,
    enum: ['pro']
  }
}, { timestamps: true, id: false });

workspaceSchema.index({ apiKey: 1 }, { unique: true });

module.exports = workspaceSchema;
