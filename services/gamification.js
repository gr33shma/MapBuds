// services/gamification.js
//
// Owns: XP awarding, streaks, and badges.
// All functions are pure (input user -> output new user), so Person 3
// can call them from Firebase Cloud Functions, client code, or tests
// without caring where the user object came from.
//
// Expected user shape (align with Person 3 — see SCHEMA.md):
// {
//   id, name, avatarSkin,
//   xp: number,
//   streak: { count: number, lastActiveDate: "YYYY-MM-DD" | null },
//   badges: string[],                 // badge ids already earned
//   stats: {
//     totalTrips: number,
//     totalDistanceMeters: number,
//     routesUsed: string[],           // unique route ids seen so far
//     transitTripsCount: number,
//     walkingTripsCount: number,
//   },
// }
//
// Expected trip event shape (from Person 1 / Person 3's sync layer):
// {
//   userId, routeId, mode: "walking" | "transit" | "driving",
//   distanceMeters, durationSeconds, completedAt: ISO string,
// }

const XP_RULES = {
  BASE_TRIP: 10,
  NEW_ROUTE_BONUS: 20,
  TRANSIT_BONUS: 5,
  WALKING_BONUS: 5,
};

export const BADGE_DEFINITIONS = [
  {
    id: 'first_trip',
    label: 'First Trip',
    check: (u) => u.stats.totalTrips >= 1,
  },
  {
    id: 'ten_trips',
    label: 'Regular Commuter',
    check: (u) => u.stats.totalTrips >= 10,
  },
  {
    id: 'explorer_5',
    label: 'Explorer',
    check: (u) => u.stats.routesUsed.length >= 5,
  },
  {
    id: 'streak_7',
    label: 'Week Warrior',
    check: (u) => u.streak.count >= 7,
  },
  {
    id: 'transit_regular',
    label: 'Transit Regular',
    check: (u) => u.stats.transitTripsCount >= 10,
  },
];

function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD", UTC
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + 'T00:00:00Z');
  const b = new Date(dateStrB + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

/**
 * Award XP for a single completed trip. Does not mutate the input user.
 * @returns {{ updatedUser, xpAwarded, breakdown }}
 */
export function awardXpForTrip(user, trip) {
  const isNewRoute = !user.stats.routesUsed.includes(trip.routeId);

  const breakdown = { base: XP_RULES.BASE_TRIP };
  let xpAwarded = XP_RULES.BASE_TRIP;

  if (isNewRoute) {
    breakdown.newRouteBonus = XP_RULES.NEW_ROUTE_BONUS;
    xpAwarded += XP_RULES.NEW_ROUTE_BONUS;
  }
  if (trip.mode === 'transit') {
    breakdown.transitBonus = XP_RULES.TRANSIT_BONUS;
    xpAwarded += XP_RULES.TRANSIT_BONUS;
  }
  if (trip.mode === 'walking') {
    breakdown.walkingBonus = XP_RULES.WALKING_BONUS;
    xpAwarded += XP_RULES.WALKING_BONUS;
  }

  const updatedUser = {
    ...user,
    xp: user.xp + xpAwarded,
    stats: {
      ...user.stats,
      totalTrips: user.stats.totalTrips + 1,
      totalDistanceMeters: user.stats.totalDistanceMeters + (trip.distanceMeters || 0),
      routesUsed: isNewRoute
        ? [...user.stats.routesUsed, trip.routeId]
        : user.stats.routesUsed,
      transitTripsCount:
        user.stats.transitTripsCount + (trip.mode === 'transit' ? 1 : 0),
      walkingTripsCount:
        user.stats.walkingTripsCount + (trip.mode === 'walking' ? 1 : 0),
    },
  };

  return { updatedUser, xpAwarded, breakdown };
}

/**
 * Daily streak check. Call this once per completed trip (or once per
 * app open) with the trip's completion date.
 * @returns {{ updatedUser, streakChanged: boolean, streakBroken: boolean }}
 */
export function updateStreak(user, activityDate = new Date()) {
  const today = todayString(activityDate);
  const { lastActiveDate, count } = user.streak;

  if (lastActiveDate === today) {
    // Already counted today — no change.
    return { updatedUser: user, streakChanged: false, streakBroken: false };
  }

  const gap = lastActiveDate ? daysBetween(lastActiveDate, today) : null;
  let newCount;
  let streakBroken = false;

  if (gap === 1) {
    newCount = count + 1; // consecutive day
  } else if (gap === null) {
    newCount = 1; // very first activity
  } else {
    newCount = 1; // gap of 2+ days — streak resets
    streakBroken = count > 0;
  }

  const updatedUser = {
    ...user,
    streak: { count: newCount, lastActiveDate: today },
  };

  return { updatedUser, streakChanged: true, streakBroken };
}

/**
 * Evaluate all badge definitions against the current user and unlock
 * any newly-earned ones.
 * @returns {{ updatedUser, newlyEarned: Array<{id, label}> }}
 */
export function evaluateBadges(user) {
  const newlyEarned = [];
  const badges = [...user.badges];

  for (const def of BADGE_DEFINITIONS) {
    if (!badges.includes(def.id) && def.check(user)) {
      badges.push(def.id);
      newlyEarned.push({ id: def.id, label: def.label });
    }
  }

  return { updatedUser: { ...user, badges }, newlyEarned };
}

/**
 * Single entry point Person 3's backend calls after a trip completes.
 * Runs XP -> streak -> badges in order (badges depend on the updated
 * stats/streak from the earlier steps) and returns everything the UI
 * needs to show feedback (toast, confetti, etc).
 *
 * @returns {{
 *   updatedUser,
 *   xpAwarded, xpBreakdown,
 *   streakChanged, streakBroken,
 *   newlyEarnedBadges,
 * }}
 */
export function processTripCompletion(user, trip) {
  const xpResult = awardXpForTrip(user, trip);
  const streakResult = updateStreak(xpResult.updatedUser, new Date(trip.completedAt));
  const badgeResult = evaluateBadges(streakResult.updatedUser);

  return {
    updatedUser: badgeResult.updatedUser,
    xpAwarded: xpResult.xpAwarded,
    xpBreakdown: xpResult.breakdown,
    streakChanged: streakResult.streakChanged,
    streakBroken: streakResult.streakBroken,
    newlyEarnedBadges: badgeResult.newlyEarned,
  };
}

/**
 * Adapter: internal user shape -> the flat shape Person 2's screens
 * already read directly off `mockUser` (see MapScreen.js, CustomizeScreen.js):
 *   { userId, xp, streak, badges: [labels], avatarSkin }
 *
 * Person 2's components never need to know about `stats`, badge ids,
 * or streak.lastActiveDate — those exist only so this module can
 * compute correctly (e.g. detect a broken streak, or a repeat route).
 * Call this right before handing the user object to the UI layer.
 */
export function toUiUser(user) {
  const badgeLabels = user.badges.map((id) => {
    const def = BADGE_DEFINITIONS.find((d) => d.id === id);
    return def ? def.label : id; // fall back to the raw id if unknown
  });

  return {
    userId: user.id,
    xp: user.xp,
    streak: user.streak.count,
    badges: badgeLabels,
    avatarSkin: user.avatarSkin,
  };
}

export function createEmptyUser({ id, name, avatarSkin = 'default' }) {
  return {
    id,
    name,
    avatarSkin,
    xp: 0,
    streak: { count: 0, lastActiveDate: null },
    badges: [],
    stats: {
      totalTrips: 0,
      totalDistanceMeters: 0,
      routesUsed: [],
      transitTripsCount: 0,
      walkingTripsCount: 0,
    },
  };
}
