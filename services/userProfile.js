// services/userProfile.js
//
// Owns: persisting the full gamification user object (see
// services/gamification.js's shape) to Firestore, keyed by uid.
//
// This didn't exist before integration — gamification.js computes
// XP/streaks/badges correctly, but nothing was saving the result
// anywhere, so it would reset every time the app restarted.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebaseConfig';
import { createEmptyUser } from './gamification';

/**
 * Loads the user's profile from Firestore. If they don't have one yet
 * (first time opening the app), creates a fresh empty one and saves it.
 */
export async function ensureUserProfile(uid, { name = 'You', avatarSkin = 'fox' } = {}) {
  const userRef = doc(firestore, 'users', uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    // Firestore doesn't store the `friends` array here — that's
    // handled separately by services/friends.js — so merge it back
    // in if present, defaulting to [].
    return { ...snap.data(), friends: snap.data().friends || [] };
  }

  const freshUser = { ...createEmptyUser({ id: uid, name, avatarSkin }), friends: [] };
  await setDoc(userRef, freshUser);
  return freshUser;
}

/**
 * Saves the full user object back to Firestore. Call this any time
 * gamification.js returns an `updatedUser`, or when the avatar skin
 * changes on the Customize screen.
 */
export function saveUserProfile(uid, user) {
  const userRef = doc(firestore, 'users', uid);
  return setDoc(userRef, user, { merge: true });
}

/**
 * Loads a single other user's profile by uid (used to build the
 * friends leaderboard). Returns null if they don't have one yet.
 */
export async function loadUserProfile(uid) {
  const userRef = doc(firestore, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}
