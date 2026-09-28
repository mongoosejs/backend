'use strict';

const crypto = require('crypto');
const mcpOAuthError = require('../util/mcpOAuthError');
const mongoose = require('mongoose');

const mcpPolicySchema = new mongoose.Schema({
  read: { type: Boolean, default: true },
  write: { type: Boolean, default: true },
  readPreference: {
    type: String,
    enum: ['secondary', 'secondaryPreferred', 'primary'],
    default: 'primary'
  },
  maxTimeMS: { type: Number, min: 1, default: 30000 }
}, { _id: false });

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String
  },
  ownerId: {
    type: 'ObjectId',
    ref: 'User'
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
    }],
    mcpPolicy: { type: mcpPolicySchema, default: () => ({}) }
  }],
  mcpPolicy: { type: mcpPolicySchema, default: () => ({}) },
  // Canonical URLs of the Studio deployments in this workspace that accept MCP
  // requests. Studio registers itself here so that the OAuth authorization
  // server can map an RFC 8707 `resource` back to a workspace.
  mcpResources: [{ type: String }],
  baseUrl: {
    type: String
  },
  stripeCustomerId: {
    type: String
  },
  stripeSubscriptionId: {
    type: String
  },
  subscriptionTier: {
    type: String,
    enum: ['', 'free', 'solo', 'pro']
  },
  stripeCustomerEmail: {
    type: String,
    lowercase: true
  }
}, {
  timestamps: true,
  id: false,
  statics: {
    /**
     * Map an OAuth `resource` back to the workspace that owns that Studio
     * deployment. Studio registers its own MCP URL on startup, which is what
     * puts it in `mcpResources`.
     */
    async findByMCPResource(resource) {
      const workspace = await this.findOne({ mcpResources: resource });
      if (workspace == null) {
        throw mcpOAuthError('invalid_target', 'Unknown MCP resource. Make sure Mongoose Studio is running with an API key.');
      }
      return workspace;
    }
  },
  methods: {
    /** The membership record for a user, or `undefined` if they are not a member. */
    memberFor(userId) {
      return this.members.find(member => member.userId.toString() === `${userId}`);
    }
  }
});

workspaceSchema.index({ apiKey: 1 }, { unique: true });
workspaceSchema.index({ mcpResources: 1 });

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
