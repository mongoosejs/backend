'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const StartDashboardEvaluateParams = new Archetype({
  authorization: {
    $type: 'string'
  },
  dashboardId: {
    $type: 'string'
  },
  workspaceId: {
    $type: 'string'
  },
  startedEvaluatingAt: {
    $type: Date
  }
}).compile('StartDashboardEvaluateParams');

module.exports = async function startDashboardEvaluate(params) {
  const { authorization, dashboardId, workspaceId, startedEvaluatingAt } = new StartDashboardEvaluateParams(params);

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
    member.userId.toString() === userId.toString() && member.roles.find(role => ['admin', 'owner', 'member'].includes(role))
  );
  if (!isAuthorized) {
    throw new Error('Unauthorized');
  }

  const dashboardResult = await DashboardResult.create({
    dashboardId,
    workspaceId,
    userId,
    startedEvaluatingAt,
    status: 'in_progress'
  });

  return { dashboardResult };
};
