'use strict';

const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true },
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