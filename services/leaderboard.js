// services/leaderboard.js
//
// Owns: turning a list of user profiles into the ranked shape
// LeaderboardScreen.js already renders (see mockLeaderboard usage):
//   { id, name, xp, avatarSkin }
//
// This is pure — Person 3 supplies the list of friend profiles
// (however they're fetched: Firestore query, RTDB snapshot, etc.)
// and this just ranks/formats them.

/**
 * @param {Array} users - full user profile objects (gamification.js shape)
 * @param {{ metric?: 'xp' | 'distance', limit?: number }} opts
 * @returns {Array<{id, name, xp, avatarSkin, distanceMeters}>}
 */
export function buildLeaderboard(users, opts = {}) {
  const { metric = 'xp', limit } = opts;

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    xp: u.xp,
    avatarSkin: u.avatarSkin,
    distanceMeters: u.stats?.totalDistanceMeters ?? 0,
  }));

  rows.sort((a, b) =>
    metric === 'distance' ? b.distanceMeters - a.distanceMeters : b.xp - a.xp
  );

  return typeof limit === 'number' ? rows.slice(0, limit) : rows;
}

/**
 * Convenience wrapper: build a leaderboard scoped to the current
 * user + their friends only (matches the "friends' XP" deliverable).
 *
 * @param {object} currentUser - must have `id` and (from Person 3) `friends: string[]`
 * @param {Array} allUsers - candidate pool to filter from (e.g. all cached friend profiles)
 */
export function getFriendsLeaderboard(currentUser, allUsers, opts = {}) {
  const friendIds = new Set([currentUser.id, ...(currentUser.friends || [])]);
  const scoped = allUsers.filter((u) => friendIds.has(u.id));
  return buildLeaderboard(scoped, opts);
}
