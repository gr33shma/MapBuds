import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MapWebView from '../components/MapWebView';
import LandmarkModal from '../components/LandmarkModal';
import { colors, type, spacing, radius } from '../utils/theme';
import { mockRoute, mockFriend, mockLandmark, mockUser } from '../utils/mockData';

const STEP_INTERVAL_MS = 1500;

export default function MapScreen({ navigation }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [landmarkVisible, setLandmarkVisible] = useState(false);
  const mapRef = useRef(null);

  const myPosition = mockRoute[stepIndex];
  const friendPosition = mockFriend.route[stepIndex] || mockFriend.route[mockFriend.route.length - 1];

  // --- Fake "GPS feed" ---------------------------------------------------
  // In production this effect goes away: Person 1/3 push real
  // {lat, lng, timestamp} updates and we just setState from that feed.
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1 < mockRoute.length ? prev + 1 : prev));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Auto-trigger the landmark popup once when we "arrive" at its
  // coordinate. At integration, Person 4 will send real proximity
  // events (e.g. via geofencing) instead of this coordinate match.
  useEffect(() => {
    const arrived =
      Math.abs(myPosition.lat - mockLandmark.lat) < 0.0002 &&
      Math.abs(myPosition.lng - mockLandmark.lng) < 0.0002;
    if (arrived) {
      setLandmarkVisible(true);
    }
  }, [stepIndex]);

  // Push the new positions into the Leaflet map running inside the WebView.
  useEffect(() => {
    mapRef.current?.updatePositions(myPosition.lat, myPosition.lng, friendPosition.lat, friendPosition.lng);
  }, [stepIndex]);

  return (
    <View style={styles.container}>
      <MapWebView
        ref={mapRef}
        initialLat={mockRoute[0].lat}
        initialLng={mockRoute[0].lng}
        meSkinId={mockUser.avatarSkin}
        friendSkinId={mockFriend.avatarSkin}
      />

      {/* Top status bar: XP + streak */}
      <View style={styles.topBar}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>XP</Text>
          <Text style={styles.pillValue}>{mockUser.xp}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Streak</Text>
          <Text style={styles.pillValue}>{mockUser.streak}🔥</Text>
        </View>
        <Pressable style={styles.pill} onPress={() => navigation.navigate('Customize')}>
          <Text style={styles.pillLabel}>Avatar</Text>
          <Text style={styles.pillValue}>Edit</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.pillLabel}>Rank</Text>
          <Text style={styles.pillValue}>🏆</Text>
        </Pressable>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.simulateButton}
          onPress={() => setLandmarkVisible(true)}
        >
          <Text style={styles.simulateButtonText}>Simulate landmark nearby</Text>
        </Pressable>
      </View>

      <LandmarkModal
        visible={landmarkVisible}
        landmark={mockLandmark}
        onClose={() => setLandmarkVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    position: 'absolute',
    top: spacing.xl + 20,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillLabel: {
    fontFamily: type.body,
    fontSize: 10,
    color: colors.textMuted,
  },
  pillValue: {
    fontFamily: type.bodySemi,
    fontSize: 14,
    color: colors.accentAmber,
  },
  bottomBar: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  simulateButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accentTeal,
  },
  simulateButtonText: {
    fontFamily: type.bodySemi,
    color: colors.accentTeal,
    fontSize: 14,
  },
});
