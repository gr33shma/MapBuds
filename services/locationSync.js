// Live location sync — this is Person 3's core deliverable.
//
// Writes YOUR location to Realtime Database at locations/{userId}
// in the exact shape the team agreed on: { lat, lng, timestamp }
//
// Also lets you SUBSCRIBE to a friend's location so you can show
// their avatar moving on the map in real time.

import { ref, set, onValue, onDisconnect, off } from "firebase/database";
import { db } from "../firebaseConfig";

/**
 * Call this every time you get a new GPS position for the current user.
 * Writes to locations/{userId} = { lat, lng, timestamp }
 */
export function updateMyLocation(userId, lat, lng) {
  const locationRef = ref(db, `locations/${userId}`);
  return set(locationRef, {
    lat,
    lng,
    timestamp: Date.now(),
  });
}

/**
 * Call this once, right after sign-in, so your location automatically
 * clears from the database if the app closes / loses connection.
 */
export function clearLocationOnDisconnect(userId) {
  const locationRef = ref(db, `locations/${userId}`);
  onDisconnect(locationRef).remove();
}

/**
 * Subscribes to a single friend's live location.
 * `callback` is called every time their location updates, with
 * an object shaped { lat, lng, timestamp } (or null if they have none yet).
 *
 * Returns an "unsubscribe" function — call it when you no longer
 * need updates (e.g. when leaving the map screen) to avoid leaks.
 */
export function subscribeToFriendLocation(friendId, callback) {
  const locationRef = ref(db, `locations/${friendId}`);

  const handler = onValue(locationRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });

  return () => off(locationRef, "value", handler);
}

/**
 * Subscribes to MULTIPLE friends at once.
 * `friendIds` is an array of userIds.
 * `callback` is called as (friendId, locationOrNull) every time any of them update.
 *
 * Returns a single "unsubscribe all" function.
 */
export function subscribeToFriendsLocations(friendIds, callback) {
  const unsubscribers = friendIds.map((friendId) =>
    subscribeToFriendLocation(friendId, (location) => callback(friendId, location))
  );

  return () => unsubscribers.forEach((unsub) => unsub());
}
