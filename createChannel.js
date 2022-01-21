const axios = require('axios');
const {WebClient} = require('@slack/web-api');
const config = require('./.config/config.js')
const readline = require('readline');
const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

 run().catch(err => console.log(err));

async function run() {
    const client = new WebClient(config.slackToken);
    let res = await client.conversations.list({types: 'public_channel, private_channel'});
    res = res.channels.map((item) => item.name_normalized);
    console.log(res);
    const val = await client.users.lookupByEmail({email: 'val@karpov.io'});
    const daniel = await client.users.lookupByEmail({email: 'daniel@meanitsoftware.com'});
    r1.question('What is the name of the channel you wish to create? ', function(name) {
        if(res.includes(name.toLowerCase())) {
            r1.emit('close', 'Name is already taken, please try again and enter a unique name.');
        }
        r1.question('public or private? ',async function(status) {
            console.log('status', status, typeof status, status.toLowerCase())
            if(status.toLowerCase == 'public') {
                status = false;
            } else if(status.toLowerCase() == 'private') {
                status = true;
            } else if(status.toLowerCase() != 'public' && status.toLowerCase() != 'private') {
                r1.emit('close', 'Not a valid option. please try again and enter public or private.');
            } 
            let response = await client.conversations.create({name: name.toLowerCase(), is_private: status });
            console.log(response);
            let reservation = await client.conversations.invite({channel: response.channel.id , users: `${val.user.id}, ${daniel.user.id}`});
            console.log(response);
            r1.emit('close', `Channel created and invites sent to ${val.user.real_name} and ${daniel.user.real_name}!`);
        });
    });
}

r1.on('close', function(reason) {
    console.log(reason);
    process.exit(0);
})

