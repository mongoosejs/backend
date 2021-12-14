
const { createRelease, getChangelog } = require('./src/integrations/githubOAuth');

async function createReleaseFromChangelog() {
  const changelog = await getChangelog();
  const array = changelog.split('\n');
  const end = array.indexOf('');
  let body = array.slice(0, end);
  const tagAndName = body[0].slice(0, body[0].indexOf(' '));
  body = body.join('\n');
  await createRelease(tagAndName, body);
}

createReleaseFromChangelog().catch((err) => console.log(err));

module.exports = { createReleaseFromChangelog };