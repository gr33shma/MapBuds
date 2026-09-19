// Run this with: node testFirebase.js
//
// This writes a fake location to the Realtime Database and reads it
// straight back, so you can confirm your Firebase project is wired up
// correctly WITHOUT needing Expo Go or your phone at all.
//
// If this script prints "SUCCESS" at the end, your Firebase setup is good.

const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get } = require("firebase/database");

const firebaseConfig = {
  apiKey: "AIzaSyCy7ET0APmwiE8aXt71pwr78lrz5Pm-WnQ",
  authDomain: "mapbuddy-a0ebd.firebaseapp.com",
  databaseURL: "https://mapbuddy-a0ebd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mapbuddy-a0ebd",
  storageBucket: "mapbuddy-a0ebd.firebasestorage.app",
  messagingSenderId: "260584515847",
  appId: "1:260584515847:web:13531f7d22429e37333da2",
};

async function runTest() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const testUserId = "test_user_123";
  const testLocation = { lat: 1.3521, lng: 103.8198, timestamp: Date.now() };

  console.log("Writing test location...");
  await set(ref(db, `locations/${testUserId}`), testLocation);

  console.log("Reading it back...");
  const snapshot = await get(ref(db, `locations/${testUserId}`));

  if (snapshot.exists() && snapshot.val().lat === testLocation.lat) {
    console.log("Read back:", snapshot.val());
    console.log("SUCCESS — Firebase Realtime Database is working correctly.");
  } else {
    console.log("FAILURE — could not read back what was written.");
  }

  process.exit(0);
}

runTest().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
