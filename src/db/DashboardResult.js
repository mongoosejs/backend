'use strict';

const mongoose = require('mongoose');

const dashboardResultSchema = new mongoose.Schema({
  dashboardId: {
    type: mongoose.ObjectId,
    ref: 'Dashboard'
  },
  workspaceId: {
    type: mongoose.ObjectId,
    ref: 'Workspace'
  },
  userId: {
    type: mongoose.ObjectId,
    ref: 'User'
  },
  startedEvaluatingAt: {
    type: Date
  },
  finishedEvaluatingAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed']
  },
  error: new mongoose.Schema({
    message: String,
    extra: String
  }),
  result: 'Mixed'
}, { timestamps: true });

module.exports = dashboardResultSchema;
