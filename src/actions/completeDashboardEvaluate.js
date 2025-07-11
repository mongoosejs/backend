'use strict';

const Archetype = require('archetype');
const connect = require('../../src/db');

const CompleteDashboardEvaluateParams = new Archetype({
  authorization: {
    $type: 'string'
  },
  dashboardResultId: {
    $type: 'string'
  },
  workspaceId: {
    $type: 'string'
  },
  finishedEvaluatingAt: {
    $type: Date
  },
  result: {
    $type: Archetype.Any
  }
}).compile('CompleteDashboardEvaluateParams');

module.exports = async function completeDashboardEvaluate(params) {
  const { authorization, dashboardResultId, workspaceId, finishedEvaluatingAt, result } = new CompleteDashboardEvaluateParams(params);

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

  const dashboardResult = await DashboardResult.findById(dashboardResultId).orFail();
  dashboardResult.finishedEvaluatingAt = finishedEvaluatingAt;
  dashboardResult.result = result;
  dashboardResult.status = 'completed';
  await dashboardResult.save();

  return { dashboardResult };
};
