'use strict';

const Archetype = require('archetype');
const assert = require('assert');
const mongoose = require('mongoose');
const slack = require('../integrations/slack');

const JobParams = new Archetype({
  url: {
    $type: 'string',
    $required: true
  },
  title: {
    $type: 'string',
    $required: true
  },
  location: {
    $type: 'string',
    $required: true
  },
  description: {
    $type: 'string',
    $required: true
  }
}).compile('JobParams');

const UpdateJobsParams = new Archetype({
  _id: {
    $type: mongoose.Types.ObjectId,
    $required: true
  },
  jobs: [JobParams]
}).compile('UpdateJobsParams');

module.exports = ({ task, conn }) => async function findJobsBySponsor(params) {
  const { Subscriber, Job } = conn.models;

  params = new UpdateJobsParams(params);
  const { _id } = params;
  let { jobs } = params;

  const subscriber = await task.sideEffect(async function findSubscriber({ _id }) {
    return Subscriber.findById(_id).exec();
  }, { _id });
  assert.ok(subscriber != null, `Subscriber ${_id} not found`);

  assert.ok(jobs.length <= 2, 'Can only post at most 2 jobs');

  const existingJobs = await task.sideEffect(async function findJobs({ subscriberId }) {
    return Job.find({ subscriberId }).exec();
  }, { subscriberId: _id });

  await Job.deleteMany({ subscriberId: _id });

  jobs = await Job.create(jobs.map(job => ({
    ...job,
    logo: subscriber.logo,
    company: subscriber.companyName,
    subscriberId: subscriber._id
  })));
  const messageObj = { channel: '#pro-notifications', blocks: [] };
  let company = '';
  let jobTitle = '';
  company = jobs[0].company;
  jobTitle = jobs.map(entry => 
    entry.title
  );
  messageObj.blocks.push({ type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Jobs Updated!* \n\n ${company} has updated the following jobs`
      }
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Jobs:* \n\n ${jobTitle.join(', ')}`
      }
    });

  await slack.sendMessage(messageObj);
  return { jobs };
};