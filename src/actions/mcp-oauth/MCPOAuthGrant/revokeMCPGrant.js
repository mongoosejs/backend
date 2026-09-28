'use strict';

const Archetype = require('archetype');
const connect = require('../../../db');
const mongoose = require('mongoose');
const resolveStudioSession = require('../../../util/resolveStudioSession');

const RevokeMCPGrantParams = new Archetype({
  authorization: { $type: 'string' },
  grantId: {
    $type: mongoose.Types.ObjectId,
    $required: true
  }
}).compile('RevokeMCPGrantParams');

/** Disconnect an MCP client. Takes effect on the client's next request. */
module.exports = async function revokeMCPGrant(params) {
  const { authorization, grantId } = new RevokeMCPGrantParams(params);

  const db = await connect();
  const { MCPOAuthGrant } = db.models;

  const { user } = await resolveStudioSession(db, authorization, { required: true });
  const grant = await MCPOAuthGrant.findOne({ _id: grantId, userId: user._id });
  if (grant == null) {
    throw new Error('MCP authorization grant not found');
  }
  await MCPOAuthGrant.revokeById(grant._id);

  return { grant: await MCPOAuthGrant.findById(grant._id) };
};
