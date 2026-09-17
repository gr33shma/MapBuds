# MapBuds — UI Starter (Person 2)

Everything here runs on mock data. Nothing depends on the other three
people's work yet — you can build the whole UI layer standalone and
swap in real data later without changing component shapes.

## 1. Install tools (one-time, free)

1. Install [Node.js](https://nodejs.org) (LTS version).
2. Install the Expo Go app on your own phone from the App Store / Play Store — this is how you'll preview the app live, no Mac or paid developer account needed.
3. In a terminal:
   ```
   npm install -g expo-cli
   ```

## 2. Set up the project

1. Unzip this folder, `cd` into it.
2. Install dependencies:
   ```
   npm install
   ```
   Expo ships new SDK versions often, so if your phone's Expo Go app ends up ahead of the version pinned here, you'll see an "SDK mismatch" error. Fix it any time with:
   ```
   npx expo install expo@latest --fix
   ```
   This rewrites every dependency version to match whatever Expo Go is on your phone, so you never have to guess version numbers by hand.
3. Start the dev server:
   ```
   npx expo start
   ```
4. Scan the QR code that appears with the Expo Go app on your phone. The app loads live — every time you save a file, it reloads on your phone automatically.

## 3. What's already built

- **`App.js`** — loads fonts, sets up navigation between Map, Customize, and Leaderboard screens.
- **`screens/MapScreen.js`** — full-screen map, your avatar animates along a fake route every 1.5s, a friend's avatar moves alongside it, XP/streak pills at top, a Leaderboard button, and the landmark popup auto-triggers when you "arrive" at its coordinate (a manual button is still there too as a backup).
- **`screens/CustomizeScreen.js`** — grid of 10 selectable avatar skins, plus a badges row pulled from `mockUser.badges`.
- **`screens/LeaderboardScreen.js`** — ranks you and two mock friends by XP, highlights your own row.
- **`components/MapWebView.js`** — the actual map, rendered via Leaflet + OpenStreetMap tiles inside a WebView. No API key, no Google Cloud account, no billing, no card required anywhere.
- **`components/LandmarkModal.js`** — the bottom-sheet fact card.
- **`utils/mockData.js`** — fake data matching the exact shapes the team agreed on. Swap the *source* of this data later; the shape shouldn't need to change.
- **`utils/theme.js`** — all colors/fonts/spacing in one place. Change a color here and it updates everywhere.

## 4. Your next steps, in order

1. Run it once, confirm the map renders and the avatar animates through the fake route.
2. Tweak `mockRoute` in `utils/mockData.js` to a real route near you (grab lat/lng pairs from Google Maps by right-clicking a point) so it feels real when you demo it. Move `mockLandmark`'s coordinates close to one of those points too, so the auto-trigger fires during your demo.
3. When Person 1 has live location data and Person 3 has friend sync working, replace the `useEffect` fake-GPS block in `MapScreen.js` with their real data feed — the rest of the screen doesn't need to change.

## 5. Notes for later (not needed now)

- The map runs on Leaflet + raw OpenStreetMap tiles inside a WebView rather than the native Google Maps component — this was a deliberate choice to avoid needing a Google Cloud billing account for the hackathon. If you ever want native map performance/features (offline caching, smoother native animation) post-hackathon, `react-native-maps` is the standard swap-in, but it requires a Google Maps API key and a linked (though free-tier) Google Cloud billing account.
- The WebView map doesn't render in a web browser preview the same way — test on your phone via Expo Go, or an Android/iOS simulator if you have one.
