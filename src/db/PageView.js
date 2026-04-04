'use strict';

const mongoose = require('mongoose');

const customEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  atMs: { type: Number, default: 0 }
}, { _id: false });

const pageViewSchema = new mongoose.Schema({
  pageViewId: { type: String, required: true, unique: true, index: true },
  sessionId: { type: String, default: null },
  pageType: { type: String, default: 'page' },
  path: { type: String, required: true },
  search: { type: String, default: '' },
  url: { type: String, default: null },
  title: { type: String, default: null },
  referrer: { type: String, default: null },
  elapsedMs: { type: Number, default: 0 },
  maxScrollDepthPercent: { type: Number, default: 0 },
  utm: { type: mongoose.Schema.Types.Mixed, default: {} },
  gclid: { type: String, default: null },
  customEvents: { type: [customEventSchema], default: [] },
  sequence: { type: Number, default: 0 },
  reason: { type: String, default: null },
  isFinal: { type: Boolean, default: false },
  visibilityState: { type: String, default: null },
  viewport: {
    width: { type: Number, default: null },
    height: { type: Number, default: null }
  },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  requestMeta: {
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    origin: { type: String, default: null },
    ipGeolocation: {
      city: { type: String, default: null },
      country: { type: String, default: null },
      countryRegion: { type: String, default: null },
      region: { type: String, default: null },
      latitude: { type: String, default: null },
      longitude: { type: String, default: null },
      timezone: { type: String, default: null }
    }
  }
}, {
  minimize: false,
  timestamps: true
});

module.exports = pageViewSchema;
