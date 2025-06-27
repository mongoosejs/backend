'use strict';

const { google } = require('googleapis');
const axios = require('axios');

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];



exports.getUserInfo = async function getUserInfo(url, token) {
  const data = await axios.get(url, {
    headers: { authorization: `Bearer ${token}` }
  });
  return data;
};

exports.getToken = async function getToken(code, callbackUrl) {
  callbackUrl = callbackUrl ?? process.env.GOOGLE_OAUTH_CALLBACK_URL;
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
  const token = await client.getToken(code);
  return token;
};

exports.generateAuthUrl = function generateAuthUrl(callbackUrl, state) {
  callbackUrl = callbackUrl ?? process.env.GOOGLE_OAUTH_CALLBACK_URL;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl
  );
  const authorizationUrl = oauth2Client.generateAuthUrl({
    scope: scopes,
    // Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes: false,
    ...(state ? { state } : {})
  });
  return authorizationUrl;
};
