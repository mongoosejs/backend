'use strict';

const axios = require('axios');


async function createRelease(tagAndName, body, PAT) {
    const release = await axios.post('https://api.github.com/repos/Automattic/mongoose/releases', {
        tag_name: tagAndName,
        name: tagAndName,
        body: body,
        // draft: true // if you want to see it first before posting
    }, {headers: {authorization: `token ${PAT}`}}).then((res) => res.data);
    return release;

}

module.exports = {createRelease}
    

