# Data Schema — Person 3 & Person 4 alignment

This is the contract `services/gamification.js` and `services/leaderboard.js`
are written against. If Person 3's backend uses different field names,
change them in one place (these files), not in Person 2's screens —
their components already consume the shapes below.

## Two shapes, one adapter

There are deliberately **two** user shapes in this app, confirmed against
Person 2's actual `utils/mockData.js`:

1. **Internal shape** (below) — what `gamification.js` computes with. It
   needs more than the UI does: `stats.routesUsed` to detect a "new
   route" for the XP bonus, `streak.lastActiveDate` to detect a missed
   day and reset the streak, and badge **ids** (not labels) so they're
   stable to query/filter on in a backend.
2. **UI shape** — the flat object Person 2's screens already read
   directly off `mockUser`:
   ```js
   { userId: 'me', xp: 240, streak: 4, badges: ['First Trip', 'Explorer'], avatarSkin: 'fox' }
   ```
   Note `streak` here is a plain number, and `badges` are human-readable
   labels — not the richer internal shapes below.

**`toUiUser(internalUser)`** in `gamification.js` converts shape 1 → shape 2.
Call it once, right before handing data to a screen; never make Person 2's
components read the internal shape directly.

## User profile (`users/{userId}`) — internal shape

```js
{
  id: "u_123",
  name: "Alex",
  avatarSkin: "fox",              // must match an id in Person 2's avatarSkins list

  xp: 240,

  streak: {
    count: 4,
    lastActiveDate: "2026-09-16"  // "YYYY-MM-DD", UTC, no time component
  },

  badges: ["first_trip", "explorer_5"],  // badge ids, see gamification.js BADGE_DEFINITIONS

  stats: {
    totalTrips: 14,
    totalDistanceMeters: 38200,
    routesUsed: ["route_hash_1", "route_hash_2"], // used to detect "new route" XP bonus
    transitTripsCount: 6,
    walkingTripsCount: 8
  },

  friends: ["u_456", "u_789"],     // owned by Person 3, referenced by leaderboard.js

  location: { lat, lng, timestamp } // owned by Person 1/3 (live GPS format)
}
```

## Trip completion event

Fired by Person 1 (route finished) and handed to Person 4's
`processTripCompletion(user, trip)`:

```js
{
  userId: "u_123",
  routeId: "route_hash_1",         // stable id for origin+destination pair
  mode: "walking" | "transit" | "driving",
  distanceMeters: 1200,
  durationSeconds: 900,
  completedAt: "2026-09-17T08:32:00Z"
}
```

`routeId` just needs to be a stable string for the same origin/destination
pair — a simple hash of rounded lat/lng pairs is fine for the hackathon.

## Landmark contract (already fixed by Person 2's `LandmarkModal.js`)

```js
{ name: "Merlion Park", fact: "...", lat: 1.2868, lng: 103.8545 }
```

`services/landmarks.js` produces exactly this shape from Wikipedia's
GeoSearch API — no changes needed on Person 2's side.

## Leaderboard row (already fixed by Person 2's `LeaderboardScreen.js`)

```js
{ id: "u_123", name: "Alex", xp: 240, avatarSkin: "fox" }
```

`services/leaderboard.js` produces this from an array of full user
profiles.

## Open questions for the Day 1 call with Person 3

- Where does `friends` live — subcollection, array field, or a separate
  RTDB path for live presence vs. a Firestore doc for the static list?
- Who writes `stats.routesUsed` — does Person 1 hash the route, or do we?
- Confirm `location` update frequency/format so `createLandmarkTracker`
  in `landmarks.js` gets called at a sane interval (it self-throttles
  Wikipedia calls to once per ~150m of movement, but it still needs a
  `{lat, lng}` on every tick).
