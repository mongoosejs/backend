'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');
const mongoose = require('mongoose');

const GetDashboardResultsParams = new Archetype({
  authorization: {
    $type: 'string'
  },
  dashboardId: {
    $type: mongoose.Types.ObjectId
  },
  workspaceId: {
    $type: mongoose.Types.ObjectId
  }
}).compile('GetDashboardResultsParams');

module.exports = async function getDashboardResults(params) {
  const { authorization, dashboardId, workspaceId } = new GetDashboardResultsParams(params);

  const db = await connect();
  const { AccessToken, DashboardResult, Workspace } = db.models;

  let userId = null;
  if (authorization) {
    const accessToken = await AccessToken.findById(authorization).orFail(new Error('Invalid access token'));
    userId = accessToken.userId;
  }

  // Find the workspace and check user permissions
  const workspace = await Workspace.findById(workspaceId).orFail(new Error('Workspace not found'));

  const isAuthorized = workspace.members.some(member =>
    member.userId.toString() === userId.toString() && member.roles.find(role => ['admin', 'owner', 'member', 'readonly', 'dashboards'].includes(role))
  );
  if (!isAuthorized) {
    throw new Error('Unauthorized');
  }

  const dashboardResults = await DashboardResult.find({ dashboardId }).sort({ _id: -1 }).limit(10);

  return { dashboardResults };
};
