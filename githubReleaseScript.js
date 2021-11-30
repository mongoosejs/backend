const axios = require('axios');
const config = require('./.config/.config.js')
const { PAT } = config;

async function createRelease() {
const changelog = await axios.get('https://api.github.com/repos/Automattic/mongoose/contents/CHANGELOG.md', {
    headers: {
        accept: 'application/vnd.github.v3.raw'
    }
}).then((res) => res.data);
const array = changelog.split('\n');
const end = array.indexOf('');
let body = array.slice(0, end);
const tagAndName = body[0].slice(0, body[0].indexOf(' '));
body = body.join('\n');


const release = await axios.post('https://api.github.com/repos/Automattic/mongoose/releases', {
    tag_name: tagAndName,
    name: tagAndName,
    body: body
    // draft: true // if you want to see it first before posting
}, {headers: {authorization: `token ${PAT}`}}).then((res) => res.data);
}


createRelease().catch((err) => console.log(err));