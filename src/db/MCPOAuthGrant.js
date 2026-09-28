'use strict';

const getEffectiveMCPPermissions = require('../util/getEffectiveMCPPermissions');
const mongoose = require('mongoose');

// The access a user delegated to one OAuth client. Studio's Workspace is the
// organization/project unit, and `resource` identifies the individual Studio
// deployment (environment) the client may talk to.
const capabilitiesSchema = new mongoose.Schema({
  read: { type: Boolean, required: true, default: true },
  write: { type: Boolean, required: true, default: false },
  readPreference: {
    type: String,
    required: true,
    enum: ['secondary', 'secondaryPreferred', 'primary'],
    default: 'primary'
  },
  maxTimeMS: { type: Number, required: true, min: 1, default: 30000 },
  collections: { type: String, default: '*' }
}, { _id: false });

const mcpOAuthGrantSchema = new mongoose.Schema({
  userId: { type: mongoose.ObjectId, required: true, ref: 'User', index: true },
  workspaceId: { type: mongoose.ObjectId, required: true, ref: 'Workspace', index: true },
  resource: { type: String, required: true },
  oauthClientId: { type: String, required: true },
  oauthClientName: { type: String, required: true },
  capabilities: { type: capabilitiesSchema, required: true },
  lastUsedAt: { type: Date },
  revokedAt: { type: Date }
}, {
  timestamps: true,
  id: false,
  statics: {
    /**
     * Intersect what the user asked to delegate with what they are actually
     * allowed to delegate. Capabilities are never stored as requested: a
     * tampered request can only ever narrow a grant, never widen one.
     */
    toCapabilities({ workspace, member, requested }) {
      const effective = getEffectiveMCPPermissions({
        workspace,
        member,
        grant: { capabilities: getEffectiveMCPPermissions.normalizeRequestedCapabilities(requested) }
      });
      return {
        read: effective.read,
        write: effective.write,
        readPreference: effective.readPreference,
        maxTimeMS: effective.maxTimeMS,
        collections: effective.collections
      };
    },

    /**
     * Revoking a grant also revokes every token issued against it, so a client
     * loses access immediately rather than when its access token expires.
     */
    async revokeById(grantId) {
      const revokedAt = new Date();
      await this.updateOne({ _id: grantId, revokedAt: null }, { $set: { revokedAt } });
      await this.db.model('MCPOAuthToken').updateMany(
        { grantId, revokedAt: null },
        { $set: { revokedAt } }
      );
    }
  }
});

module.exports = mcpOAuthGrantSchema;
