'use strict';

const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'enabled'
  },
  email: { type: String },
  githubUsername: { type: String, required: true },
  githubUserId: { type: String },
  githubOrganization: { type: String },
  githubOrganizationId: { type: String },
  githubOrganizationMembers: [
    new mongoose.Schema({
      login: { type: String, required: true },
      id: { type: String, required: true }
    }, { _id: false })],
  installationId: { type: String }
});

module.exports = subscriberSchema;