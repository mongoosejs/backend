'use strict';

const connect = require('../src/db');

run().catch(err => {
  console.error(err);
  process.exit(1);
});

async function run() {
  const conn = await connect();

  const { Subscriber } = conn.models;

  const subscribers = [
    {
      githubUsername: 'paton',
      githubUserId: '609881',
      githubOrganization: 'Localize',
      githubOrganizationId: '11488209',
      companyName: 'Localize',
      url: 'https://localizejs.com/',
      logo: '//images.ctfassets.net/3ouphkrynjol/3mfb7HH2YowrPxX9C6ik6H/723034bcb4e99349663c4bc8223fb8b6/localizejs.com.png',
      description: 'The Localize platform helps businesses of all sizes easily translate websites, applications, and documents into foreign languages, opening up access to new markets quickly and efficiently. And developers of all stripes will appreciate the simplicity of installing a single code snippet that unlocks an industry-leading and secure translation experience. Learn more at <a href="https://localizejs.com">localizejs.com</a>.'
    },
    {
      githubUsername: 'bradvogel',
      githubUserId: '821706',
      githubOrganization: 'mixmaxhq',
      githubOrganizationId: '7530142',
      companyName: 'Mixmax',
      url: 'https://www.mixmax.com/'
    },
    {
      githubUsername: 'deverseli800',
      githubUserId: '1518135',
      githubOrganization: 'Bowery-RES',
      githubOrganizationId: '21259990',
      companyName: 'Bowery Valuation',
      url: 'http://www.boweryvaluation.com'
    },
    {
      githubUsername: 'adamreisnz',
      githubUserId: '490562',
      githubOrganization: 'helloclub',
      githubOrganizationId: '45475059',
      companyName: 'Hello Club',
      url: 'https://helloclub.com/?source=Mongoose',
      logo: '/docs/images/helloclub.svg',
      description: '<a href="https://helloclub.com/?source=Mongoose">Hello Club</a> is a cloud-based club and membership management solution which offers a range of features for tracking members, finances, bookings, events, resources and access control. Hello Club makes member management easy and efficient, and caters to a large variety of organisations, including clubs, associations, non-profits, sport centres, gyms and co-working spaces. Consistent 5 star reviews, monthly new features, and a team that is dedicated to helping you succeed make Hello Club the best choice for your organisation. Try it now with a 30 day free trial!'
    },
    {
      githubUsername: 'sliss',
      githubUserId: '3977547',
      githubOrganization: 'Birb-app',
      githubOrganizationId: '91162271',
      companyName: 'Birb',
      url: 'https://birb.app',
      logo: 'https://uploads-ssl.webflow.com/618b15b23212e0b2b4f8f67b/618b1fe1146ed447bb1cc820_white%20filled%20birb2.png',
      description: 'Birb is an e-commerce referral marketing platform to reward customers for referring their business to friends and followers.'
    }
  ];

  for (const sub of subscribers) {
    await Subscriber.findOneAndUpdate({ githubUsername: sub.githubUsername }, {
      $set: sub
    }, { upsert: true });
  }

  process.exit(0);
}