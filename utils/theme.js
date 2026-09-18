// Design tokens for MapBuds.
// Theme: "night transit map" — deep navy canvas, amber avatar/accent,
// teal for routes and positive states. Avoids the generic
// cream+terracotta or SaaS-card look on purpose.

export const colors = {
  background: '#0F1B33',   // deep navy, like a map at night
  surface: '#1B2A4A',      // cards / panels floating above the map
  surfaceRaised: '#25396340',
  border: '#2E4066',
  accentAmber: '#FFB703',  // avatar, XP, highlights — "transit line yellow"
  accentTeal: '#06D6A0',   // routes, success, streaks
  accentCoral: '#FF6B6B',  // delays / alerts
  textPrimary: '#F4F6FB',
  textMuted: '#93A2C7',
  white: '#FFFFFF',
};

export const type = {
  display: 'Baloo2_700Bold',   // playful, rounded — headers & big numbers
  displaySemi: 'Baloo2_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export default { colors, type, spacing, radius };
