
const axios = require('axios');
const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true },
    githubUsername: { type: String, required: true },
    githubUserId: { type: String },
    githubOrganization: { type: String },
    githubOrganizationId: { type: String }
  });
  
 run().catch(err => console.log(err));

async function run() {
  const url = 'https://slack.com/api/chat.postMessage';
  const res = await axios.post(url, {
    channel: '#pro-notifications',
    text: 'Hello, World!'
  }, { headers: { authorization: `Bearer ${slackToken}` } });

  console.log('Done', res.data);
}

// test();
/*
async function test() {
    let conn = mongoose.createConnection('mongodb+srv://mongoose21:ggknyTbObfxa6kF7@cluster0-xvnqv.mongodb.net/mongoose?retryWrites=true&w=majority');
    await conn.asPromise();
   let Subscriber = conn.model('Subscriber', subscriberSchema, 'Subscriber');
   await Subscriber.create({
       email: 'dcd57@miami.edu',
       githubUsername: 'IslandRhythms'
   });
   console.log('done');
}

*/