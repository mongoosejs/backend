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

    const task = await Task.create({
        method: req.method,
        url: req.url,
        params: req.body
    });
    const params = { authorization: req.headers.authorization };

    const res = await verifyGithubAccessToken({ task, conn })(params);

    if(res) {
        console.log('success')
        const sub = await Subscriber.findById();
        sub.companyName;
        sub.description;
        sub.logo;
        await sub.save();
        return;
    } else {
        console.log('error');
        return;
    }
});