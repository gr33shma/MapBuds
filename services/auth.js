// Handles signing the user in anonymously so they get a unique userId
// without needing a login screen. Call signInUser() once when the app
// starts (e.g. in App.js), then use the returned uid everywhere else.

import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";

/**
 * Signs the user in anonymously and resolves with their userId.
 * Safe to call multiple times — Firebase reuses the existing session.
 */
export function signInUser() {
  return new Promise((resolve, reject) => {
    signInAnonymously(auth).catch(reject);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user.uid);
      }
    });
  });
}
