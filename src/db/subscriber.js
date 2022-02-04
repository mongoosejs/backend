'use strict';

const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  login: { type: String, required: true },
  id: { type: String, required: true },
  avatar: { type: String, required: true, default: '/images/dog2.webp', alias: 'avatar_url' }
}, { _id: false });

const subscriberSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['enabled', 'disabled'],
    default: 'enabled'
  },
  email: { type: String },
  githubUsername: { type: String, required: true },
  githubUserId: { type: String, required: true },
  githubOrganization: { type: String },
  githubOrganizationId: { type: String },
  githubOrganizationMembers: [memberSchema],
  installationId: { type: String },
  companyName: { type: String },
  description: { type: String },
  logo: { type: String },
  url: { type: String }
});

module.exports = subscriberSchema;