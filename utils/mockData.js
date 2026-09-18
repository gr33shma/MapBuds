// ---------------------------------------------------------------
// MOCK DATA — matches the shared contracts the team agreed on.
// Swap these for real data at integration time; nothing in the
// UI components should need to change shape, only the source.
// ---------------------------------------------------------------

// Matches Person 1 / Person 3's location object:
// { lat, lng, timestamp }
// NOTE: this is what controls where the map is centered and where your
// avatar moves. To move the whole demo to a different city/area, edit
// THIS array — not mockLandmark below, which only controls where the
// landmark fact popup auto-triggers.
export const mockRoute = [
  { lat: 1.3521, lng: 103.8198, timestamp: 1000 },
  { lat: 1.3526, lng: 103.8205, timestamp: 2000 },
  { lat: 1.3532, lng: 103.8212, timestamp: 3000 },
  { lat: 1.3539, lng: 103.822, timestamp: 4000 },
  { lat: 1.3546, lng: 103.8229, timestamp: 5000 },
  { lat: 1.3554, lng: 103.8238, timestamp: 6000 },
];

// A fake friend, also sending {lat, lng, timestamp} updates
export const mockFriend = {
  id: 'friend_1',
  name: 'Mia',
  avatarSkin: 'fox',
  route: [
    { lat: 1.3525, lng: 103.8202, timestamp: 1000 },
    { lat: 1.353, lng: 103.821, timestamp: 2000 },
    { lat: 1.3538, lng: 103.8219, timestamp: 3000 },
    { lat: 1.3545, lng: 103.8227, timestamp: 4000 },
    { lat: 1.3553, lng: 103.8236, timestamp: 5000 },
    { lat: 1.356, lng: 103.8244, timestamp: 6000 },
  ],
};

// Matches Person 4's landmark fact object:
// { name, fact, lat, lng }
// NOTE: for the auto-trigger in MapScreen to fire, these coordinates
// need to be close (within ~20m) to one of the points in mockRoute
// above — otherwise your avatar never "arrives" and the popup only
// shows via the manual "Simulate landmark nearby" button.
export const mockLandmark = {
  name: 'Merlion Park',
  fact: 'The Merlion has stood at the mouth of the Singapore River since 1972, half lion and half fish.',
  lat: 1.3546,
  lng: 103.8229,
};

// Matches Person 4's user/gamification object:
// { userId, xp, streak, badges: [], avatarSkin }
export const mockUser = {
  userId: 'me',
  xp: 240,
  streak: 4,
  badges: ['First Trip', 'Explorer'],
  avatarSkin: 'fox',
};

export const avatarSkins = [
  { id: 'fox', label: 'Fox', emoji: '🦊' },
  { id: 'owl', label: 'Owl', emoji: '🦉' },
  { id: 'robot', label: 'Robot', emoji: '🤖' },
  { id: 'panda', label: 'Panda', emoji: '🐼' },
  { id: 'dragon', label: 'Dragon', emoji: '🐲' },
  { id: 'cat', label: 'Cat', emoji: '🐱' },
  { id: 'astronaut', label: 'Astronaut', emoji: '🧑\u200d🚀' },
  { id: 'ninja', label: 'Ninja', emoji: '🥷' },
  { id: 'unicorn', label: 'Unicorn', emoji: '🦄' },
  { id: 'alien', label: 'Alien', emoji: '👽' },
];

// A second friend, purely so the leaderboard has more than one row to show.
export const mockFriend2 = {
  id: 'friend_2',
  name: 'Theo',
  avatarSkin: 'ninja',
  xp: 310,
  route: [
    { lat: 1.353, lng: 103.8195, timestamp: 1000 },
    { lat: 1.3536, lng: 103.8203, timestamp: 2000 },
    { lat: 1.3543, lng: 103.8214, timestamp: 3000 },
    { lat: 1.355, lng: 103.8223, timestamp: 4000 },
    { lat: 1.3557, lng: 103.8233, timestamp: 5000 },
    { lat: 1.3563, lng: 103.8241, timestamp: 6000 },
  ],
};

// Matches Person 4's leaderboard shape: an array of {id, name, xp, avatarSkin}
export const mockLeaderboard = [
  { id: 'me', name: 'You', xp: mockUser.xp, avatarSkin: mockUser.avatarSkin },
  { id: 'friend_1', name: mockFriend.name, xp: 275, avatarSkin: mockFriend.avatarSkin },
  { id: 'friend_2', name: mockFriend2.name, xp: mockFriend2.xp, avatarSkin: mockFriend2.avatarSkin },
];
