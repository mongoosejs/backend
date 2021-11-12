'use strict';

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  method: String,
  url: String,
  logs: [{ timestamp: Date, message: String, extra: Object }],
  params: Object
}, { timestamps: true });

taskSchema.methods.log = function log(message, extra) {
  this.logs.push({ timestamp: new Date(), message, extra });
  return this.save();
};

module.exports = taskSchema;