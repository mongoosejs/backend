'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const mongoose = require('mongoose');

const FindJobsBySponsorParams = new Archetype({
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('FindJobsBySponsorParams');

module.exports = ({ task, conn }) => async function findJobsBySponsor(params) {
  const { Subscriber, Job } = conn.models;

  params = new FindJobsBySponsorParams(params);
  const { _id } = params;

  const subscriber = await task.sideEffect(async function findSubscriber({ _id }) {
    return Subscriber.findById(_id).exec();
  }, { _id });
  assert.ok(subscriber != null, `Subscriber ${_id} not found`);

  const jobs = await Job.find({ subscriberId: _id });

  return { jobs };
};