'use strict';

const mongoose = require('mongoose');
const time = require('time-commando');

const invitationSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  githubUsername: {
    type: String
  },
  email: {
    type: String
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roles: [{
    type: String,
    required: true,
    enum: ['admin', 'member', 'readonly', 'dashboards']
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: () => time.now() + 7 * time.oneDayMS
  }
}, { timestamps: true, id: false });

invitationSchema.post('validate', function () {
  if (!this.email && !this.githubUsername) {
    throw new Error('Either email or githubUsername is required');
  }
});

module.exports = invitationSchema;
