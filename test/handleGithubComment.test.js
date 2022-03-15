'use strict';

const TaskSchema = require('../src/db/task');
const assert = require('assert');
const sinon = require('sinon');
const slack = require('../src/integrations/slack');
const handleGithubComment = require('../src/actions/handleGithubComment');

describe('handleGithubComment', function() {
  let Task;
  let task;
  before(() => {
    Task = conn.model('Task', TaskSchema);
  });

  beforeEach(async function() {
    task = await Task.create({});
  });

  afterEach(() => sinon.restore());

  it('successfully sends a message', async function() {

    const params = {
        "action": "created",
        "issue": {
          "url": "https://api.github.com/repos/Automattic/mongoose/issues/11038",
          "repository_url": "https://api.github.com/repos/Automattic/mongoose",
          "labels_url": "https://api.github.com/repos/Automattic/mongoose/issues/11038/labels{/name}",
          "comments_url": "https://api.github.com/repos/Automattic/mongoose/issues/11038/comments",
          "events_url": "https://api.github.com/repos/Automattic/mongoose/issues/11038/events",
          "html_url": "https://github.com/Automattic/mongoose/issues/11038",
          "id": {
            "$numberInt": "1069759720"
          },
          "node_id": "I_kwDOAAkfd84_wzzo",
          "number": {
            "$numberInt": "11038"
          },
          "title": "[6.x regression / behavior change?] findOneAndUpdate no longer sets undefined fields as null",
          "user": {
            "login": "ronjouch",
            "id": {
              "$numberInt": "522085"
            },
            "node_id": "MDQ6VXNlcjUyMjA4NQ==",
            "avatar_url": "https://avatars.githubusercontent.com/u/522085?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/ronjouch",
            "html_url": "https://github.com/ronjouch",
            "followers_url": "https://api.github.com/users/ronjouch/followers",
            "following_url": "https://api.github.com/users/ronjouch/following{/other_user}",
            "gists_url": "https://api.github.com/users/ronjouch/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/ronjouch/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/ronjouch/subscriptions",
            "organizations_url": "https://api.github.com/users/ronjouch/orgs",
            "repos_url": "https://api.github.com/users/ronjouch/repos",
            "events_url": "https://api.github.com/users/ronjouch/events{/privacy}",
            "received_events_url": "https://api.github.com/users/ronjouch/received_events",
            "type": "User",
            "site_admin": false
          },
          "labels": [
            {
              "id": {
                "$numberInt": "28988582"
              },
              "node_id": "MDU6TGFiZWwyODk4ODU4Mg==",
              "url": "https://api.github.com/repos/Automattic/mongoose/labels/confirmed-bug",
              "name": "confirmed-bug",
              "color": "e10c02",
              "default": false,
              "description": "We've confirmed this is a bug in Mongoose and will fix it."
            }
          ],
          "state": "closed",
          "locked": false,
          "assignee": null,
          "assignees": [],
          "milestone": {
            "url": "https://api.github.com/repos/Automattic/mongoose/milestones/476",
            "html_url": "https://github.com/Automattic/mongoose/milestone/476",
            "labels_url": "https://api.github.com/repos/Automattic/mongoose/milestones/476/labels",
            "id": {
              "$numberInt": "7282494"
            },
            "node_id": "MI_kwDOAAkfd84Abx8-",
            "number": {
              "$numberInt": "476"
            },
            "title": "6.1.3",
            "description": "",
            "creator": {
              "login": "vkarpov15",
              "id": {
                "$numberInt": "1620265"
              },
              "node_id": "MDQ6VXNlcjE2MjAyNjU=",
              "avatar_url": "https://avatars.githubusercontent.com/u/1620265?v=4",
              "gravatar_id": "",
              "url": "https://api.github.com/users/vkarpov15",
              "html_url": "https://github.com/vkarpov15",
              "followers_url": "https://api.github.com/users/vkarpov15/followers",
              "following_url": "https://api.github.com/users/vkarpov15/following{/other_user}",
              "gists_url": "https://api.github.com/users/vkarpov15/gists{/gist_id}",
              "starred_url": "https://api.github.com/users/vkarpov15/starred{/owner}{/repo}",
              "subscriptions_url": "https://api.github.com/users/vkarpov15/subscriptions",
              "organizations_url": "https://api.github.com/users/vkarpov15/orgs",
              "repos_url": "https://api.github.com/users/vkarpov15/repos",
              "events_url": "https://api.github.com/users/vkarpov15/events{/privacy}",
              "received_events_url": "https://api.github.com/users/vkarpov15/received_events",
              "type": "User",
              "site_admin": false
            },
            "open_issues": {
              "$numberInt": "12"
            },
            "closed_issues": {
              "$numberInt": "2"
            },
            "state": "open",
            "created_at": "2021-10-23T23:28:00Z",
            "updated_at": "2021-12-15T15:13:42Z",
            "due_on": null,
            "closed_at": null
          },
          "comments": {
            "$numberInt": "1"
          },
          "created_at": "2021-12-02T16:40:44Z",
          "updated_at": "2021-12-15T15:13:42Z",
          "closed_at": "2021-12-15T15:13:42Z",
          "author_association": "NONE",
          "active_lock_reason": null,
          "body": "I confirm I am using the latest version of mongoose as of today: 6.0.14\r\n\r\n**Do you want to request a *feature* or report a *bug*?**\r\n\r\nUnsure. Maybe this is a 6.x bug/regression, but maybe this is a desired behavior change. Halp, please: is this change desired, and was it documented? I couldn't find a trace of it, neither in the [mongoose / Migrating from 5.x to 6.x](https://mongoosejs.com/docs/migrating_to_6.html) nor in the underlying [node-mongodb-native / Changes in 4.x (and how to migrate!)](https://github.com/mongodb/node-mongodb-native/blob/HEAD/docs/CHANGES_4.0.0.md) docs.\r\n\r\n**Steps to reproduce**\r\n\r\n```js\r\n#!/usr/bin/env node\r\nconst mongoose = require('mongoose');\r\nconst mongooseVersion = require('./node_modules/mongoose/package.json').version;\r\nconst mongooseMajorVersion = parseInt(mongooseVersion.substring(0, 1), 10);\r\nconst mongooseOptions = mongooseMajorVersion === 6 ? {} : { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false };\r\nmongoose.connect('mongodb://localhost:27017/test', mongooseOptions);\r\n\r\nconst Cat = mongoose.model('Cat', { name: String, age: Number });\r\n\r\nasync function testCase() {\r\n  console.log('Using mongoose @', mongooseVersion);\r\n\r\n  // Cleanup for re-runnability\r\n  await Cat.deleteMany({ name: 'Zildjian' });\r\n  const freshZildjian = await Cat.create({ name: 'Zildjian' })\r\n  console.log('Zildjian was born:', JSON.stringify(freshZildjian, null, 2));\r\n\r\n  // What matters\r\n  const updatedZildjian = await Cat.findOneAndUpdate(\r\n    { name: 'Zildjian' }, // Will *NOT* be found, so this findOneAndUpdate will always upsert\r\n    { $set: { age: undefined } }, // What matters: we attempt to set a key with an undefined value\r\n    { new: true },\r\n  )\r\n  console.log('Updated Zildjian:', JSON.stringify(updatedZildjian, null, 2));\r\n  // Difference between Mongoose 5 and 6:\r\n  // - Mongoose 5 used to return a cat with `\"age\": null`\r\n  // - Mongoose 6 returns a cat with no `age`\r\n  // Desired change, or regression?\r\n}\r\n\r\ntestCase().then(() => {\r\n  mongoose.disconnect();\r\n  process.exit(0);\r\n})\r\n```\r\n\r\n**What is the current behavior?**\r\n\r\nMongoose 6 `findOneAndUpdate` does *not* set `undefined` values\r\n\r\n```\r\nUsing mongoose @ 6.0.14\r\nZildjian was born: {\r\n  \"name\": \"Zildjian\",\r\n  \"_id\": \"61a8f24bcdb4dcd14f0ecd03\",\r\n  \"__v\": 0\r\n}\r\nUpdated Zildjian: {\r\n  \"_id\": \"61a8f24bcdb4dcd14f0ecd03\",\r\n  \"name\": \"Zildjian\",\r\n  \"__v\": 0\r\n  // Mongoose 6 does *not* set an `age` key/value (which was passed with value `undefined`)\r\n}\r\n```\r\n\r\n**What is the expected behavior?**\r\n\r\nMongoose 5 `findOneAndUpdate` used to set undefined values as `null`:\r\n\r\n```\r\nUsing mongoose @ 5.13.13\r\nZildjian was born: {\r\n  \"_id\": \"61a8f23dd1891e9f846319d4\",\r\n  \"name\": \"Zildjian\",\r\n  \"__v\": 0\r\n}\r\nUpdated Zildjian: {\r\n  \"_id\": \"61a8f23dd1891e9f846319d4\",\r\n  \"name\": \"Zildjian\",\r\n  \"__v\": 0,\r\n  \"age\": null  // <-- HERE: Mongoose 5 sets the `undefined` age value as `null`\r\n}\r\n```\r\n\r\n→ Is this change desired, and was it documented? I couldn't find a trace of it, neither in the [mongoose / Migrating from 5.x to 6.x](https://mongoosejs.com/docs/migrating_to_6.html) nor in the underlying [node-mongodb-native / Changes in 4.x (and how to migrate!)](https://github.com/mongodb/node-mongodb-native/blob/HEAD/docs/CHANGES_4.0.0.md) docs.\r\n\r\n**What are the versions of Node.js, Mongoose and MongoDB you are using?**\r\n\r\n- Node.js 14.18.2\r\n- Mongoose 5.13.13 / 6.0.14\r\n- MongoDB 5.0.4",
          "timeline_url": "https://api.github.com/repos/Automattic/mongoose/issues/11038/timeline",
          "performed_via_github_app": null
        },
        "comment": {
          "url": "https://api.github.com/repos/Automattic/mongoose/issues/comments/994888151",
          "html_url": "https://github.com/Automattic/mongoose/issues/11038#issuecomment-994888151",
          "issue_url": "https://api.github.com/repos/Automattic/mongoose/issues/11038",
          "id": {
            "$numberInt": "994888151"
          },
          "node_id": "IC_kwDOAAkfd847TMnX",
          "user": {
            "login": "vkarpov15",
            "id": {
              "$numberInt": "1620265"
            },
            "node_id": "MDQ6VXNlcjE2MjAyNjU=",
            "avatar_url": "https://avatars.githubusercontent.com/u/1620265?v=4",
            "gravatar_id": "",
            "url": "https://api.github.com/users/vkarpov15",
            "html_url": "https://github.com/vkarpov15",
            "followers_url": "https://api.github.com/users/vkarpov15/followers",
            "following_url": "https://api.github.com/users/vkarpov15/following{/other_user}",
            "gists_url": "https://api.github.com/users/vkarpov15/gists{/gist_id}",
            "starred_url": "https://api.github.com/users/vkarpov15/starred{/owner}{/repo}",
            "subscriptions_url": "https://api.github.com/users/vkarpov15/subscriptions",
            "organizations_url": "https://api.github.com/users/vkarpov15/orgs",
            "repos_url": "https://api.github.com/users/vkarpov15/repos",
            "events_url": "https://api.github.com/users/vkarpov15/events{/privacy}",
            "received_events_url": "https://api.github.com/users/vkarpov15/received_events",
            "type": "User",
            "site_admin": false
          },
          "created_at": "2021-12-15T15:13:42Z",
          "updated_at": "2021-12-15T15:13:42Z",
          "author_association": "COLLABORATOR",
          "body": "This is expected behavior in 6.x, we removed the `omitUndefined` option and made it true always. That means Mongoose will always strip undefined keys from updates. There's an entry in the [changelog](https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md#600-rc0--2021-08-03), and we'll add a note to the migration guide with #10672. ",
        },
      };

      const stub = sinon.stub(slack, 'sendMessage').callsFake(() => Promise.resolve('Message Sent'));
      console.log('yo', slack.sendMessage(params))

      const res = await handleGithubComment({task, conn})(params);
      console.log('the res', res)

  });
});