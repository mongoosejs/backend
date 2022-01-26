'use strict'

const Archetype = require('archetype');
const azureWrapper = require('../util/azureWrapper');
const connect = require('../src/db');

const GithubEntity = new Archetype({
  login: {
    $type: 'string',
    $required: true
  },
  id: {
    $type: 'number',
    $required: true
  },
  type: {
    $type: 'string'
  }
}).compile('GithubEntity');

const GithubSponsorsParams = new Archetype({
  action: {
    $type: 'string'
  },
  sponsorship: {
    sponsor: {
      $type: GithubEntity
    },
    tier: {
      name: {
        $type: 'string'
      },
      is_one_time: {
        $type: 'boolean'
      },
      is_custom_amount: {
        $type: 'boolean'
      }
    }
  },
  sender: {
    $type: GithubEntity
  }
}).compile('GithubSponsorsParams');

module.exports = azureWrapper(webhookGithubSponsors);
module.exports.rawFunction = webhookGithubSponsors;

async function webhookGithubSponsors(context, req) {
  const conn = await connect();
  const AccessToken = conn.model('AccessToken');
  const Subscriber = conn.model('Subscriber');
  const Task = conn.model('Task');

  const task = await Task.create({
    method: req.method,
    url: req.url,
    params: req.body
  });

  const { action, sponsorship, sender } = new GithubSponsorsParams(req.body);

  if (action == null || sponsorship == null) {
    return $ignored;
  }

  let subscriber;
  switch (action) {
    case 'created':
      if (sponsorship.tier.name !== 'Mongoose Pro Subscriber') {
        break;
      }
      if (sponsorship.tier.is_one_time) {
        break;
      }
      if (sponsorship.tier.is_custom_amount) {
        break;
      }

      const data = {
        githubUsername: sender.login,
        githubUserId: sender.id
      };
      if (sponsorship.sponsor.type === 'Organization') {
        Object.assign(data, {
          githubOrganization: sponsorship.sponsor.login,
          githubOrganizationId: sponsorship.sponsor.id
        });
      }

      subscriber = await Subscriber.create(data);
  
      return { subscriber };
    case 'tier_changed':
      if (sponsorship.tier.name !== 'Mongoose Pro Subscriber') {
        subscriber = await Subscriber.findOneAndUpdate({ githubOrganizationId: sponsorship.sponsor.id }, {
          $set: {
            status: 'disabled'
          }
        }, { returnOriginal: false });
  
        if (subscriber == null) {
          break;
        }
    
        return { subscriber };
      }

      subscriber = await Subscriber.findOneAndUpdate({ githubOrganizationId: sponsorship.sponsor.id }, {
        githubUsername: sender.login,
        githubUserId: sender.id,
        githubOrganization: sponsorship.sponsor.login
      }, { returnOriginal: false, upsert: true });
  
      return { subscriber };
    case 'cancelled':
      subscriber = await Subscriber.findOneAndUpdate({ githubOrganizationId: sponsorship.sponsor.id }, {
        $set: {
          status: 'disabled'
        }
      }, { returnOriginal: false });

      if (subscriber == null) {
        break;
      }
  
      return { subscriber };
    default:
      break;
  }

  return { $ignored: true };
};