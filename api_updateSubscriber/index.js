'use strict'


const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');
const verifyGithubAccessToken = require('../src/actions/verifyGithubAccessToken');

module.exports = azureWrapper(async function (context, req) {
    console.log('Hello There, I am a welcome message');
    console.log('req', req);
    const conn = await connect();
    const Task = conn.model('Task');
    const Subscriber = conn.model('Subscriber');
    const Token = conn.model('AccessToken');

    const token = await Token.findById({_id: req.headers.accessToken});

    const task = await Task.create({
        method: req.method,
        url: req.url,
        params: req.body
    });


    if(token.subscriberId != req.body.user) {
        console.log('error, mismatch');
        return;
    }
    console.log('POST')
    const sub = await Subscriber.findById({_id: req.body.user});
    sub.companyName = req.body.company;
    sub.description = req.body.description;
    sub.logo = req.body.logo;
    await sub.save();
    return sub;
});