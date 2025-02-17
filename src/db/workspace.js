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
    type: String
  },
  stripeSubscriptionId: {
    type: String
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'pro']
  }
}, { timestamps: true, id: false });

workspaceSchema.index({ apiKey: 1 }, { unique: true });

workspaceSchema.virtual('pricePerSeat').get(function pricePerSeat() {
  if (this.subscriptionTier === 'free') {
    return 0;
  }
  if (this.subscriptionTier === 'pro') {
    return 19;
  }

  return null;
});

module.exports = workspaceSchema;
