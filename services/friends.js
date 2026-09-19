// Simple friends list, stored in Firestore.
// Structure: users/{userId} document has a field friends: [friendId, ...]

import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { firestore } from "../firebaseConfig";

/**
 * Adds friendId to userId's friends list.
 * Creates the user's document if it doesn't exist yet.
 */
export async function addFriend(userId, friendId) {
  const userRef = doc(firestore, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, { friends: [friendId] });
  } else {
    await updateDoc(userRef, { friends: arrayUnion(friendId) });
  }
}

/**
 * Returns the array of friendIds for a given userId.
 * Returns [] if the user has no document / no friends yet.
 */
export async function getFriends(userId) {
  const userRef = doc(firestore, "users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return [];
  return userSnap.data().friends || [];
}
