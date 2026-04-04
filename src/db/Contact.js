'use strict';

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  company: { type: String },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = contactSchema;
