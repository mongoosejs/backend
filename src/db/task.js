'use strict';

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  method: String,
  url: String,
  sideEffects: [{ start: Date, end: Date, name: String, params: 'Mixed', result: 'Mixed' }],
  logs: [{ timestamp: Date, message: String, extra: Object }],
  params: Object
}, { timestamps: true });

taskSchema.methods.log = function log(message, extra) {
  this.logs.push({ timestamp: new Date(), message, extra });
  return this.save();
};

taskSchema.methods.sideEffect = async function sideEffect(fn, params) {
  this.sideEffects.push({ timestamp: new Date(), name: fn.name, params });
  const sideEffect = this.sideEffects[this.sideEffects.length - 1];
  await this.save();
  const result = await fn(params);

  sideEffect.end = new Date();
  sideEffect.result = result;
  await this.save();

  return result;
}

module.exports = taskSchema;