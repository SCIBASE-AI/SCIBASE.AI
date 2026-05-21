const crypto = require('crypto');

const DEFAULT_POLICY = {
  staleAfterSeconds: 120,
  anonymousRoles: ['anonymous_reviewer', 'blind_reviewer'],
  restrictedSectionVisibilities: ['private', 'embargoed', 'restricted'],
  lockSensitiveSectionKinds: ['dataset', 'notebook', 'figure'],
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function indexById(items) {
  const out = new Map();
  for (const item of asArray(items)) {
    if (item && item.id) {
      out.set(item.id, item);
    }
  }
  return out;
}

function hasSectionAccess(user, section) {
  if (!section) {
    return false;
  }
  const visibility = section.visibility || 'public';
  if (visibility === 'public') {
    return true;
  }
  if (visibility === 'institutional') {
    return user.institution && user.institution === section.institution;
  }
  if (visibility === 'private' || visibility === 'restricted') {
    return asArray(section.allowedUsers).includes(user.id) || asArray(user.roles).includes('owner');
  }
  if (visibility === 'embargoed') {
    return asArray(section.allowedUsers).includes(user.id) || asArray(user.roles).includes('admin');
  }
  return false;
}

function publicName(user, policy) {
  const roles = asArray(user.roles);
  if (roles.some((role) => policy.anonymousRoles.includes(role)) || user.anonymous === true) {
    return user.alias || 'Anonymous reviewer';
  }
  return user.name || user.id;
}

function sanitizeLocationForViewer(presence, section, viewer, policy) {
  const canSee = hasSectionAccess(viewer, section);
  if (!section || !canSee) {
    return {
      visible: false,
      sectionId: '',
      sectionTitle: 'Restricted section',
      cursorAnchor: '',
      reason: section ? 'viewer_lacks_section_access' : 'unknown_section',
    };
  }

  const restrictedTitle = policy.restrictedSectionVisibilities.includes(section.visibility);
  const lockedSensitive = section.locked && policy.lockSensitiveSectionKinds.includes(section.kind);
  return {
    visible: true,
    sectionId: section.id,
    sectionTitle: restrictedTitle || lockedSensitive ? 'Restricted section' : section.title,
    cursorAnchor: restrictedTitle || lockedSensitive ? '' : presence.cursorAnchor,
    reason: restrictedTitle || lockedSensitive ? 'location_redacted' : 'visible',
  };
}

function evaluatePresenceForViewer(presence, usersById, sectionsById, viewer, policy) {
  const user = usersById.get(presence.userId) || { id: presence.userId, roles: [] };
  const section = sectionsById.get(presence.sectionId);
  const blockers = [];
  const warnings = [];
  const actions = [];

  if (!section) {
    blockers.push('unknown_section');
    actions.push('drop_unknown_cursor_anchor');
  }

  if (Number(presence.ageSeconds || 0) > policy.staleAfterSeconds) {
    warnings.push('stale_presence');
    actions.push('expire_stale_presence_session');
  }

  if (section && !hasSectionAccess(viewer, section)) {
    blockers.push('viewer_lacks_section_access');
    actions.push('suppress_cursor_location_for_viewer');
  }

  if (section && section.locked && policy.lockSensitiveSectionKinds.includes(section.kind) && !asArray(section.allowedUsers).includes(viewer.id)) {
    blockers.push('locked_sensitive_section_cursor');
    actions.push('redact_locked_section_cursor_anchor');
  }

  if (user.anonymous && presence.displayName && presence.displayName === user.name) {
    blockers.push('anonymous_identity_leak');
    actions.push('replace_display_name_with_alias');
  }

  const sanitized = sanitizeLocationForViewer(presence, section, viewer, policy);
  return {
    userId: user.id,
    displayName: publicName(user, policy),
    originalDisplayName: presence.displayName || '',
    viewerId: viewer.id,
    status: blockers.length ? 'blocked' : warnings.length ? 'warn' : 'safe',
    sanitizedLocation: sanitized,
    blockers,
    warnings,
    actions: unique(actions),
  };
}

function evaluatePresencePrivacy(input) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const room = input.room || {};
  const users = asArray(room.users);
  const sections = asArray(room.sections);
  const presences = asArray(room.presences);
  const viewers = asArray(room.viewers);
  const usersById = indexById(users);
  const sectionsById = indexById(sections);
  const evaluations = [];
  const blockers = [];
  const warnings = [];
  const actions = [];

  for (const viewer of viewers) {
    for (const presence of presences) {
      if (presence.userId === viewer.id) {
        continue;
      }
      const result = evaluatePresenceForViewer(presence, usersById, sectionsById, viewer, policy);
      evaluations.push(result);
      for (const blocker of result.blockers) {
        blockers.push(`${viewer.id}_${presence.userId}_${blocker}`);
      }
      for (const warning of result.warnings) {
        warnings.push(`${viewer.id}_${presence.userId}_${warning}`);
      }
      for (const action of result.actions) {
        actions.push(`${viewer.id}_${presence.userId}_${action}`);
      }
    }
  }

  const sanitizedSnapshots = viewers.map((viewer) => ({
    viewerId: viewer.id,
    entries: evaluations
      .filter((entry) => entry.viewerId === viewer.id)
      .map((entry) => ({
        userId: entry.userId,
        displayName: entry.displayName,
        status: entry.status,
        location: entry.sanitizedLocation,
      })),
  }));

  const packet = {
    room: {
      id: room.id,
      title: room.title,
    },
    status: blockers.length ? 'hold' : warnings.length ? 'broadcast_with_expiry' : 'broadcast',
    blockedBroadcasts: evaluations.filter((entry) => entry.status === 'blocked').length,
    warningBroadcasts: evaluations.filter((entry) => entry.status === 'warn').length,
    safeBroadcasts: evaluations.filter((entry) => entry.status === 'safe').length,
    blockers: unique(blockers),
    warnings: unique(warnings),
    reviewerActions: unique(actions),
    evaluations,
    sanitizedSnapshots,
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  DEFAULT_POLICY,
  digest,
  evaluatePresencePrivacy,
};
