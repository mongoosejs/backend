'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const extrovert = require('extrovert');
const google = require('../../src/integrations/google');
const stripe = require('../../src/integrations/stripe');

const userInfoURL = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';

const GoogleOAuthParams = new Archetype({
  code: {
    $type: 'string'
  },
  callbackUrl: {
    $type: 'string'
  }
}).compile('GoogleOAuthParams');

module.exports = extrovert.toNetlifyFunction(async function googleLogin(params) {
  const db = await connect();
  const { AccessToken, Invitation, User, Workspace } = db.models;

  const { code, callbackUrl } = new GoogleOAuthParams(params);

  const workspaceId = params.workspaceId;
  const workspace = await Workspace.findById(workspaceId).orFail();

  const { tokens } = await google.getToken(code, callbackUrl);
  const token = tokens['access_token'];
  const { data } = await google.getUserInfo(userInfoURL, token);

  const { id: googleUserId, email, picture, given_name: firstName, family_name: lastName } = data;

  const $set = {
    googleUserId,
    email,
    picture,
    name: `${firstName} ${lastName}`
  };

  const user = await User.findOneAndUpdate(
    { googleUserId },
    {
      $set
    },
    { upsert: true, returnDocument: 'after' }
  );

  const accessToken = await AccessToken.create({
    userId: user._id
  });

  const member = workspace.members.find(member => member.userId.toString() === user._id.toString());
  let roles = null;
  if (member == null) {
    const invitation = await Invitation.findOne({
      email,
      workspaceId,
      status: 'pending'
    });
    if (invitation != null) {
      workspace.members.push({ userId: user._id, roles: invitation.roles });
      await workspace.save();

      invitation.status = 'accepted';
      await invitation.save();

      roles = invitation.roles;

      if (workspace.stripeSubscriptionId && !user.isFreeUser) {
        const users = await User.find({ _id: { $in: workspace.members.map(member => member.userId) }, isFreeUser: { $ne: true } });
        const seats = users.length;
        await stripe.updateSubscriptionSeats(workspace.stripeSubscriptionId, seats);
      }
    } else if (workspace.subscriptionTier === 'free') {
      workspace.members.push({ userId: user._id, roles: ['readonly'] });
      await workspace.save();

      roles = ['readonly'];
    }
  } else {
    roles = member.roles;
  }

  return { user, accessToken, roles };
});
