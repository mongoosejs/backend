'use strict';

const githubOAuth = require('../integrations/githubOAuth');

module.exports = async function createReleaseFromChangelog() {
  const changelog = await githubOAuth.getChangelog();
  const array = changelog.split('\n');
  const end = array.indexOf('') === -1 ? array.length : array.indexOf('');
  let body = array.slice(0, end);
  const tagAndName = body[0].slice(0, body[0].indexOf(' '));
  body = body.join('\n');
  await githubOAuth.createRelease(tagAndName, body);
};