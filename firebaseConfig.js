// Firebase setup for MapBuds
// This file connects the app to the MapBuddy Firebase project.
// It does NOT set up Analytics — that's a website-only feature and
// will cause errors in Expo/React Native, so it's left out on purpose.

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCy7ET0APmwiE8aXt71pwr78lrz5Pm-WnQ",
  authDomain: "mapbuddy-a0ebd.firebaseapp.com",
  databaseURL: "https://mapbuddy-a0ebd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mapbuddy-a0ebd",
  storageBucket: "mapbuddy-a0ebd.firebasestorage.app",
  messagingSenderId: "260584515847",
  appId: "1:260584515847:web:13531f7d22429e37333da2",
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app); // Realtime Database — used for live location
export const firestore = getFirestore(app); // Firestore — used for friends list
export const auth = getAuth(app); // Auth — anonymous sign-in
