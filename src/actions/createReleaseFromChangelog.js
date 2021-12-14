'use strict';

const githubOAuth = require('../integrations/githubOAuth');

module.exports = task => async function createReleaseFromChangelog(ref) {
  if (ref == null) {
    return;
  }
  const changelog = await task.sideEffect(githubOAuth.getChangelog, {});
  const lines = changelog.split('\n');
  let changelogLines = null;
  for (let i = 0; i < lines.length; ++i) {
    if (!lines[i].startsWith(ref + ' /')) {
      continue;
    }

    changelogLines = lines.slice(i);
    const end = changelogLines.indexOf('') === -1 ? changelogLines.length : changelogLines.indexOf('');
    changelogLines = changelogLines.slice(0, end);
    break;
  }

  if (changelogLines == null) {
    return;
  }
  
  let body = changelogLines;
  const tagAndName = body[0].slice(0, body[0].indexOf(' '));
  body = body.join('\n');
  await task.sideEffect(function createRelease({ tagAndName, body }) {
    return githubOAuth.createRelease(tagAndName, body);
  }, { tagAndName, body });
};