const axios = require('axios');
const mongoose = require('mongoose');
const config = require('./.config/.config.js');

 run().catch(err => console.log(err));

async function run() {
  const result = await axios.get('https://opencollective.com/mongoose/members.json');
  // console.log(result.data);
  const sponsors = [];
  for(let i = 0 ; i < result.data.length; i++) {
    if(result.data[i].tier == 'sponsor' && result.data[i].isActive) {
      sponsors.push(`
      <a rel="sponsored" href="${result.data[i].website}">
      <img class="sponsor" src="${result.data[i].image}" style="height:100px"/>
      </a>
      `);
    }
  }

  const url = 'https://slack.com/api/chat.postMessage';
  const res = await axios.post(url, {
    channel: '#pro-notifications',
    text: sponsors.join('')
  }, { headers: { authorization: `Bearer ${config.slackToken}` } });
  

  // console.log('Done', res.data);
}

