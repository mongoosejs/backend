'use strict';

const READ_PREFERENCE_RANK = {
  secondary: 0,
  secondaryPreferred: 1,
  primary: 2
};

const WRITE_ROLES = ['owner', 'admin', 'member'];
const READ_ROLES = ['owner', 'admin', 'member', 'readonly', 'dashboards'];

const DEFAULT_MAX_TIME_MS = 30000;

// The most permissive policy Studio will ever delegate to an MCP client, used
// as the starting point when a workspace or member has no explicit policy.
const UNRESTRICTED_POLICY = {
  read: true,
  write: true,
  readPreference: 'primary',
  maxTimeMS: DEFAULT_MAX_TIME_MS
};

/**
 * Resolve the effective database access for an MCP request by intersecting the
 * workspace policy, the member's policy, the member's roles, and the
 * capabilities stored on the authorization grant. Every layer can only take
 * access away, never add it, so a grant can never exceed what the user has.
 */
module.exports = function getEffectiveMCPPermissions({ workspace, member, grant }) {
  const maximum = getMaximumMCPPermissions({ workspace, member });
  const requested = normalizePolicy(grant?.capabilities, { read: true, write: false });

  const write = maximum.write && requested.write;
  const read = maximum.read && requested.read;
  return {
    read,
    write,
    readPreference: mostRestrictiveReadPreference([maximum.readPreference, requested.readPreference]),
    maxTimeMS: Math.min(maximum.maxTimeMS, requested.maxTimeMS),
    collections: grant?.capabilities?.collections || '*',
    roles: downgradeRoles(member?.roles || [], write)
  };
};

/**
 * The ceiling for a member: what they could delegate if they delegated
 * everything they have. The authorization page uses this to decide which
 * controls to show, and `getEffectiveMCPPermissions()` uses it as the upper
 * bound for any grant.
 */
function getMaximumMCPPermissions({ workspace, member }) {
  const roles = member?.roles || [];
  const workspacePolicy = normalizePolicy(workspace?.mcpPolicy, UNRESTRICTED_POLICY);
  const memberPolicy = normalizePolicy(member?.mcpPolicy, UNRESTRICTED_POLICY);

  const write = roles.some(role => WRITE_ROLES.includes(role)) &&
    workspacePolicy.write &&
    memberPolicy.write;
  return {
    read: roles.some(role => READ_ROLES.includes(role)) && workspacePolicy.read && memberPolicy.read,
    write,
    readPreference: mostRestrictiveReadPreference([workspacePolicy.readPreference, memberPolicy.readPreference]),
    maxTimeMS: Math.min(workspacePolicy.maxTimeMS, memberPolicy.maxTimeMS),
    roles: downgradeRoles(roles, write)
  };
}

module.exports.getMaximumMCPPermissions = getMaximumMCPPermissions;

/**
 * Coerce whatever the authorization page submitted into a capabilities object.
 * Requested values are never trusted: `getEffectiveMCPPermissions()` intersects
 * them with the member's ceiling before anything is persisted or enforced.
 */
module.exports.normalizeRequestedCapabilities = function normalizeRequestedCapabilities(capabilities) {
  const normalized = normalizePolicy(capabilities, { read: true, write: false });
  return {
    ...normalized,
    collections: capabilities?.collections || '*'
  };
};

module.exports.READ_PREFERENCES = Object.keys(READ_PREFERENCE_RANK);
module.exports.DEFAULT_MAX_TIME_MS = DEFAULT_MAX_TIME_MS;

function normalizePolicy(policy, defaults) {
  return {
    read: policy?.read == null ? defaults.read : policy.read === true,
    write: policy?.write == null ? defaults.write : policy.write === true,
    readPreference: READ_PREFERENCE_RANK[policy?.readPreference] == null ?
      defaults.readPreference ?? 'primary' :
      policy.readPreference,
    maxTimeMS: Number.isFinite(policy?.maxTimeMS) && policy.maxTimeMS > 0 ?
      policy.maxTimeMS :
      defaults.maxTimeMS ?? DEFAULT_MAX_TIME_MS
  };
}

function mostRestrictiveReadPreference(preferences) {
  return preferences.reduce(
    (result, preference) => READ_PREFERENCE_RANK[preference] < READ_PREFERENCE_RANK[result] ? preference : result,
    'primary'
  );
}

// Studio authorizes actions by role, so a read-only grant is enforced by
// handing the MCP request a read-only version of the user's roles.
function downgradeRoles(roles, write) {
  if (write) {
    return [...roles];
  }
  const downgraded = roles.map(role => WRITE_ROLES.includes(role) ? 'readonly' : role).
    filter(role => READ_ROLES.includes(role));
  return [...new Set(downgraded)];
}
