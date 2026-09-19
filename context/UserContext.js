// context/UserContext.js
//
// Ties together Person 3's anonymous auth (services/auth.js) with the
// gamification profile (services/gamification.js + services/userProfile.js)
// so every screen can read/update "the current user" in one place instead
// of each screen managing its own copy.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInUser } from '../services/auth';
import { ensureUserProfile, saveUserProfile } from '../services/userProfile';
import { toUiUser } from '../services/gamification';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState(null); // full gamification.js shape
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    signInUser()
      .then(async (signedInUid) => {
        const loadedProfile = await ensureUserProfile(signedInUid);
        if (!cancelled) {
          setUid(signedInUid);
          setProfile(loadedProfile);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[UserContext] sign-in/profile load failed:', err.message);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Call this any time gamification.js (or a screen like Customize)
  // produces a new version of the profile. Updates local state AND
  // persists to Firestore.
  function updateProfile(updatedProfile) {
    setProfile(updatedProfile);
    if (uid) saveUserProfile(uid, updatedProfile);
  }

  const value = {
    uid,
    profile, // full internal shape — use for gamification.js calls
    uiUser: profile ? toUiUser(profile) : null, // flat shape screens render
    updateProfile,
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser() must be called inside a <UserProvider>');
  return ctx;
}
