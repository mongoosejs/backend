'use strict';

const axios = require('axios');

async function getChangelog() {
    const changelog = await axios.get('https://api.github.com/repos/Automattic/mongoose/contents/CHANGELOG.md', {
    headers: {
        accept: 'application/vnd.github.v3.raw'
    }
    }).then((res) => res.data);
    return changelog;
}

module.exports = {getChangelog}