import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, ActivityIndicator } from 'react-native';
import MapWebView from '../components/MapWebView';
import LandmarkModal from '../components/LandmarkModal';
import { colors, type, spacing, radius } from '../utils/theme';
import { avatarSkins, mockLandmark } from '../utils/mockData';
import { useUser } from '../context/UserContext';

import { getCurrentLocation, watchUserLocation } from '../navigation/locationService';
import { searchDestination } from '../navigation/geocodingService';
import { getCommuterRecommendation } from '../navigation/commuterDecisionService';
import { updateMyLocation, subscribeToFriendsLocations, clearLocationOnDisconnect } from '../services/locationSync';
import { getFriends } from '../services/friends';
import { loadUserProfile } from '../services/userProfile';
import { createLandmarkTracker, haversineMeters } from '../services/landmarks';
import { processTripCompletion } from '../services/gamification';

// These come from a .env file at the project root (gitignored — see
// .env.example). Person 1's OneMap token and LTA account key go here.
const ONEMAP_TOKEN = process.env.EXPO_PUBLIC_ONEMAP_TOKEN;
const LTA_KEY = process.env.EXPO_PUBLIC_LTA_KEY;

const ARRIVAL_RADIUS_METERS = 50;

function emojiFor(skinId) {
  return (avatarSkins.find((s) => s.id === skinId) || avatarSkins[0]).emoji;
}

export default function MapScreen({ navigation }) {
  const { uid, profile, uiUser, updateProfile } = useUser();

  const [myPosition, setMyPosition] = useState(null);
  const [landmarkVisible, setLandmarkVisible] = useState(false);
  const [activeLandmark, setActiveLandmark] = useState(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [destination, setDestination] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [searching, setSearching] = useState(false);
  const [tripAwardMessage, setTripAwardMessage] = useState(null);

  const mapRef = useRef(null);
  const landmarkTracker = useRef(createLandmarkTracker()).current;
  const tripCompletedRef = useRef(false);
  const friendProfilesRef = useRef({}); // friendId -> {avatarSkin, name}

  // --- 1. Get + continuously watch the user's real GPS position ---------
  useEffect(() => {
    if (!uid) return;
    let subscription;

    (async () => {
      try {
        const initial = await getCurrentLocation();
        setMyPosition(initial);
        mapRef.current?.updateMyPosition(initial.lat, initial.lng);
        updateMyLocation(uid, initial.lat, initial.lng);

        subscription = await watchUserLocation((position) => {
          setMyPosition(position);
        });

        clearLocationOnDisconnect(uid);
      } catch (err) {
        console.warn('[MapScreen] location error:', err.message);
      }
    })();

    return () => subscription?.remove?.();
  }, [uid]);

  // --- 2. Whenever position changes: move avatar, sync to Firebase, ------
  //        check landmarks, check trip arrival ------------------------------
  useEffect(() => {
    if (!myPosition || !uid) return;

    mapRef.current?.updateMyPosition(myPosition.lat, myPosition.lng);
    updateMyLocation(uid, myPosition.lat, myPosition.lng);

    landmarkTracker.update(myPosition).then((landmark) => {
      if (landmark) {
        setActiveLandmark(landmark);
        setLandmarkVisible(true);
      }
    });

    if (destination && !tripCompletedRef.current) {
      const distance = haversineMeters(myPosition, destination);
      if (distance <= ARRIVAL_RADIUS_METERS) {
        tripCompletedRef.current = true;
        completeTrip();
      }
    }
  }, [myPosition]);

  // --- 3. Subscribe to friends' live locations ----------------------------
  useEffect(() => {
    if (!uid) return;
    let unsubscribe;

    (async () => {
      const friendIds = await getFriends(uid);
      if (!friendIds.length) return;

      // Grab each friend's avatar skin once up front (locations update
      // far more often than someone changes their avatar).
      await Promise.all(
        friendIds.map(async (friendId) => {
          const friendProfile = await loadUserProfile(friendId);
          friendProfilesRef.current[friendId] = friendProfile || {};
        })
      );

      unsubscribe = subscribeToFriendsLocations(friendIds, (friendId, location) => {
        if (!location) {
          mapRef.current?.removeFriend(friendId);
          return;
        }
        const skin = friendProfilesRef.current[friendId]?.avatarSkin;
        mapRef.current?.upsertFriend(friendId, location.lat, location.lng, emojiFor(skin));
      });
    })();

    return () => unsubscribe?.();
  }, [uid]);

  // --- Destination search ---------------------------------------------
  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await searchDestination(query, ONEMAP_TOKEN);
      setResults(found);
    } catch (err) {
      console.warn('[MapScreen] search error:', err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handlePickDestination(place) {
    setDestination(place);
    setResults([]);
    setQuery(place.name);
    tripCompletedRef.current = false;
    setRecommendation(null);

    if (!myPosition) return;
    try {
      const rec = await getCommuterRecommendation({
        origin: myPosition,
        destination: place,
        oneMapAccessToken: ONEMAP_TOKEN,
        ltaAccountKey: LTA_KEY,
      });
      setRecommendation(rec);
    } catch (err) {
      console.warn('[MapScreen] recommendation error:', err.message);
    }
  }

  // --- Trip completion -> gamification -----------------------------------
  function completeTrip() {
    if (!profile || !destination) return;

    const mode =
      recommendation?.recommendationType === 'normal' ||
      recommendation?.recommendationType === 'alternative-transit' ||
      recommendation?.recommendationType === 'bus-fallback'
        ? 'transit'
        : 'walking';

    const trip = {
      userId: uid,
      routeId: `${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`,
      mode,
      distanceMeters: myPosition ? haversineMeters(myPosition, destination) : 0,
      durationSeconds: (recommendation?.recommendedDurationMinutes || 0) * 60,
      completedAt: new Date().toISOString(),
    };

    const result = processTripCompletion(profile, trip);
    updateProfile(result.updatedUser);

    const badgeText = result.newlyEarnedBadges.length
      ? ` New badge: ${result.newlyEarnedBadges.map((b) => b.label).join(', ')}!`
      : '';
    setTripAwardMessage(`+${result.xpAwarded} XP — trip complete!${badgeText}`);
    setTimeout(() => setTripAwardMessage(null), 4000);

    setDestination(null);
    setRecommendation(null);
    setQuery('');
  }

  return (
    <View style={styles.container}>
      <MapWebView
        ref={mapRef}
        initialLat={myPosition?.lat || 1.3521}
        initialLng={myPosition?.lng || 103.8198}
        meSkinEmoji={emojiFor(uiUser?.avatarSkin)}
      />

      {/* Top status bar: XP + streak */}
      <View style={styles.topBar}>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>XP</Text>
          <Text style={styles.pillValue}>{uiUser?.xp ?? 0}</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Streak</Text>
          <Text style={styles.pillValue}>{uiUser?.streak ?? 0}🔥</Text>
        </View>
        <Pressable style={styles.pill} onPress={() => navigation.navigate('Customize')}>
          <Text style={styles.pillLabel}>Avatar</Text>
          <Text style={styles.pillValue}>Edit</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={styles.pillLabel}>Rank</Text>
          <Text style={styles.pillValue}>🏆</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => navigation.navigate('Friends')}>
          <Text style={styles.pillLabel}>Friends</Text>
          <Text style={styles.pillValue}>👥</Text>
        </Pressable>
      </View>

      {/* Destination search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Where to?"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color={colors.accentAmber} />}
      </View>

      {results.length > 0 && (
        <View style={styles.resultsList}>
          <FlatList
            data={results}
            keyExtractor={(item, idx) => `${item.name}-${idx}`}
            renderItem={({ item }) => (
              <Pressable style={styles.resultRow} onPress={() => handlePickDestination(item)}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Recommendation card */}
      {recommendation && (
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationType}>{recommendation.recommendationType.toUpperCase()}</Text>
          <Text style={styles.recommendationMessage}>{recommendation.message}</Text>
          <Text style={styles.recommendationMeta}>
            ETA: {recommendation.recommendedDurationMinutes} min
            {recommendation.extraMinutes > 0 ? ` (+${recommendation.extraMinutes} min vs usual)` : ''}
          </Text>
        </View>
      )}

      {tripAwardMessage && (
        <View style={styles.awardBanner}>
          <Text style={styles.awardBannerText}>{tripAwardMessage}</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {destination && !tripCompletedRef.current && (
          <Pressable
            style={[styles.simulateButton, styles.demoButton]}
            onPress={() => {
              tripCompletedRef.current = true;
              completeTrip();
            }}
          >
            <Text style={styles.simulateButtonText}>
              Demo: force-complete trip to {destination.name}
            </Text>
          </Pressable>
        )}
        <Pressable
          style={styles.simulateButton}
          onPress={() => {
            setActiveLandmark(mockLandmark);
            setLandmarkVisible(true);
          }}
        >
          <Text style={styles.simulateButtonText}>Simulate landmark nearby</Text>
        </Pressable>
      </View>

      <LandmarkModal
        visible={landmarkVisible}
        landmark={activeLandmark}
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
  searchBar: {
    position: 'absolute',
    top: spacing.xl + 76,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: type.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resultsList: {
    position: 'absolute',
    top: spacing.xl + 128,
    left: spacing.md,
    right: spacing.md,
    maxHeight: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  resultRow: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: {
    fontFamily: type.bodySemi,
    fontSize: 14,
    color: colors.textPrimary,
  },
  resultAddress: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  recommendationCard: {
    position: 'absolute',
    bottom: spacing.xl + 64,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentTeal,
  },
  recommendationType: {
    fontFamily: type.bodySemi,
    fontSize: 11,
    color: colors.accentTeal,
    marginBottom: 4,
  },
  recommendationMessage: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  recommendationMeta: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    color: colors.accentAmber,
  },
  awardBanner: {
    position: 'absolute',
    top: '45%',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.accentAmber,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  awardBannerText: {
    fontFamily: type.bodySemi,
    fontSize: 14,
    color: colors.background,
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
  demoButton: {
    marginBottom: spacing.sm,
    borderColor: colors.accentAmber,
  },
  simulateButtonText: {
    fontFamily: type.bodySemi,
    color: colors.accentTeal,
    fontSize: 14,
  },
});
