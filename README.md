# MapBuds 🗺️

**A gamified, social commuter companion for Singapore's public transport network.**

Built for Problem Statement 02: *"Smarter decisions. Smoother journeys."* — a system that gives commuters proactive, real-time decision support during both planned and unplanned transit disruptions.

---

## What MapBuds does

MapBuds turns the daily commute into something you actually want to check. Instead of a plain map, you get:

- **A customizable avatar** that represents you on a live map, walking your actual route in real time
- **Smart commute recommendations** that combine real-time public transport routing with live MRT/LTA service alerts — if your usual line is disrupted, MapBuds automatically finds you an unaffected alternative route or a bus fallback, instead of you finding out at the platform
- **Live friend syncing** — see your friends' avatars moving on the map in real time, wherever they are
- **Gamification** — earn XP for completed trips, build daily streaks, and unlock badges (first trip, explorer, week warrior, transit regular, and more)
- **Nearby landmark facts** — real Wikipedia-sourced facts pop up automatically as you pass points of interest on your route
- **A friends leaderboard** ranked by XP

## The problem it solves

LTA's network moves millions of people daily, and disruptions (planned maintenance, unplanned faults, surges) happen constantly. Most commuters only find out their line is affected *after* they're already stuck on the platform. MapBuds flips that: it checks live LTA service alerts against your specific planned journey **before you leave**, and proactively tells you whether to stay on your usual route, take a specific unaffected alternative, or switch to a bus — with an honest estimate of how much extra time that costs you.

## Features at a glance

| Feature | How it works |
|---|---|
| Live avatar navigation | Real GPS tracking, avatar moves on an interactive map in real time |
| Disruption-aware routing | Cross-references OneMap public transport routes against live LTA train service alerts |
| Destination search | Search any address/place in Singapore via OneMap's geocoding API |
| Friend syncing | Real-time location sharing between friends via Firebase Realtime Database |
| Gamification | XP, streaks, and badges computed from real completed trips, persisted per user |
| Landmark facts | Auto-fetched from Wikipedia based on your live GPS position |
| Leaderboard | Friends ranked by total XP |

## Tech stack

- **React Native + Expo (SDK 57)** — cross-platform app framework, runs on iOS and Android from one codebase
- **Leaflet.js + OpenStreetMap** (rendered inside a WebView) — the live map itself. Chosen deliberately over the native Google Maps SDK to avoid requiring every judge/tester to set up a paid Google Cloud billing account just to run a hackathon demo
- **OneMap API (SLA/data.gov.sg)** — public transport routing and destination search, Singapore-specific
- **LTA DataMall API** — live train service alerts and disruption data
- **Firebase Realtime Database** — live friend location syncing
- **Firebase Firestore** — persisted user profiles (XP, streaks, badges, avatar, friends list)
- **Firebase Anonymous Auth** — frictionless sign-in with no login screen, persisted across app restarts via AsyncStorage
- **Wikipedia GeoSearch API** — real landmark facts based on live coordinates
- **expo-location** — GPS access and continuous location tracking

## Project structure

```
navigation/    → OneMap routing, geocoding, GPS, and LTA disruption logic
services/      → Firebase location sync, friends, gamification, landmarks, leaderboard, user profiles
context/       → shared app-wide user/auth state
screens/       → Map, Customize (avatar), Leaderboard, Friends
components/    → the map itself (MapWebView), the landmark fact popup
```

---

## Running this app

This works the same way on **Mac, Windows, iPhone, and Android** — Expo is cross-platform. No Xcode or Android Studio needed.

### 1. Install prerequisites

- **Node.js** (LTS) — [nodejs.org](https://nodejs.org)
- **Expo Go** app on your phone — search "Expo Go" on the App Store (iPhone) or Play Store (Android)

### 2. Clone and install

```bash
git clone https://github.com/gr33shma/MapBuds.git
cd MapBuds
npm install
```

This installs everything, including Firebase, `expo-location`, and `@react-native-async-storage/async-storage` — no separate install steps needed.

### 3. Set up your API keys

Copy the example env file:

```bash
cp .env.example .env
```

(On Windows, if `cp` isn't recognized, just duplicate `.env.example` in File Explorer and rename it to `.env`.)

Open `.env` and fill in two values:

```
EXPO_PUBLIC_ONEMAP_TOKEN=your_token_here
EXPO_PUBLIC_LTA_KEY=your_key_here
```

**Where to get these (both free):**
- **OneMap token**: register at [onemap.gov.sg](https://www.onemap.gov.sg/apidocs/) and generate an access token from your account
- **LTA DataMall key**: register at [datamall.lta.gov.sg](https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html) for a free Account Key

> `.env` is already git-ignored — your keys will never be committed or visible to anyone else who clones this repo.

Firebase's config is already included in `firebaseConfig.js` and needs no setup — it's a shared project the whole team uses.

### 4. Run it

```bash
npx expo start
```

A QR code appears in your terminal.

- **iPhone**: open the built-in **Camera** app and point it at the QR code, then tap the notification that appears
- **Android**: open the **Expo Go** app directly and use its built-in QR scanner

Your phone and computer need to be on the **same WiFi network** for this to work. If they aren't (e.g. testing on a phone hotspot, different networks, or a restrictive public WiFi), run this instead:

```bash
npx expo start --tunnel
```

This routes through the internet instead of your local network — slightly slower to load, but works from anywhere.

### 5. Grant permissions

On first launch, the app will ask for **location permission** — this is required for the map, avatar movement, and disruption-aware routing to work. Please allow it.

---

## Known limitations (by design, for a hackathon build)

- **Adding friends is manual**: open the "Friends" tab, share your ID, and have your friend add it (and vice versa) — there's no auto-discovery of nearby users yet.
- **Map tiles use free OpenStreetMap data** rather than Google Maps, so styling is simpler than Google's — a deliberate trade-off to keep the app runnable by anyone without a billing setup.
- **LTA/OneMap API keys are personal to whoever registers them** — each person running this app locally needs their own free keys (see step 3 above); they are not bundled with the repo for security reasons.

## Team

Built by a 4-person team: navigation & disruption routing, live location sync (Firebase), gamification & landmark facts, and app UI/UX & integration.
