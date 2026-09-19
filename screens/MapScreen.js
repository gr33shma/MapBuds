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

function decodePolyline(encoded) {
  const coordinates = [];

  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat =
      result & 1 ? ~(result >> 1) : result >> 1;

    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng =
      result & 1 ? ~(result >> 1) : result >> 1;

    lng += deltaLng;

    coordinates.push([
      lat / 1e5,
      lng / 1e5
    ]);
  }

  return coordinates;
}

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

      console.log('[MapScreen] recommendation:', rec);

      // Get the route that MapBuds ultimately recommends
      const selectedRoute = rec?.route;

      // OneMap public-transport routes contain legs with legGeometry
      const legs = selectedRoute?.legs || [];

      const routeCoordinates = [];

      for (const leg of legs) {
        const points = leg?.legGeometry?.points;

        if (!points) continue;

        const decoded = decodePolyline(points);

        routeCoordinates.push(...decoded);
      }

      if (routeCoordinates.length > 0) {
        mapRef.current?.drawRoute(
          routeCoordinates,
          place.lat,
          place.lng
        );
      } else {
        console.warn('[MapScreen] No drawable route geometry found');
      }
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
      {/* Journey recommendation */}
      {recommendation && (
        <View style={styles.recommendationCard}>
          <View style={styles.recommendationHeader}>
            <View>
              <Text style={styles.recommendationType}>
                {recommendation.recommendationType === 'normal'
                  ? 'RECOMMENDED ROUTE'
                  : recommendation.recommendationType
                      .replace(/-/g, ' ')
                      .toUpperCase()}
              </Text>

              <Text style={styles.etaText}>
                {recommendation.recommendedDurationMinutes} min
              </Text>
            </View>

            {recommendation.extraMinutes > 0 && (
              <Text style={styles.extraTime}>
                +{recommendation.extraMinutes} min
              </Text>
            )}
          </View>

          {recommendation.journey?.length > 0 && (
            <View style={styles.journeyRow}>
              {recommendation.journey.map((step, index) => {
                const isTrain =
                  typeof step === 'string' &&
                  (
                    step === 'EW' ||
                    step === 'NS' ||
                    step === 'NE' ||
                    step === 'CC' ||
                    step === 'DT' ||
                    step === 'TE' ||
                    step === 'BP' ||
                    step.includes('LINE')
                  );

                return (
                  <React.Fragment key={`${step}-${index}`}>
                    <View style={styles.transportStep}>
                      <Text style={styles.transportIcon}>
                        {isTrain ? '🚆' : '🚌'}
                      </Text>
                      <Text style={styles.transportLabel}>
                        {step}
                      </Text>
                    </View>

                    {index < recommendation.journey.length - 1 && (
                      <Text style={styles.routeArrow}>→</Text>
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          <Text style={styles.recommendationMessage}>
            {recommendation.message}
          </Text>
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
              ✓ Complete Trip
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
          <Text style={styles.simulateButtonText}>
            📍 Demo Landmark
          </Text>
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
    bottom: 145,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentTeal,
  },

  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  recommendationType: {
    fontFamily: type.bodySemi,
    fontSize: 11,
    color: colors.accentTeal,
  },

  etaText: {
    fontFamily: type.bodySemi,
    fontSize: 22,
    color: colors.accentAmber,
    marginTop: 2,
  },

  extraTime: {
    fontFamily: type.bodySemi,
    fontSize: 13,
    color: colors.accentAmber,
  },

  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },

  transportStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  transportIcon: {
    fontSize: 14,
    marginRight: 4,
  },

  transportLabel: {
    fontFamily: type.bodySemi,
    fontSize: 13,
    color: colors.textPrimary,
  },

  routeArrow: {
    fontSize: 16,
    color: colors.textMuted,
    marginHorizontal: 5,
  },

  recommendationMessage: {
    fontFamily: type.body,
    fontSize: 12,
    color: colors.textPrimary,
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
    bottom: 24,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  simulateButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.accentTeal,
    maxWidth: '48%',
  },
  demoButton: {
    borderColor: colors.accentAmber,
  },
  simulateButtonText: {
    fontFamily: type.bodySemi,
    color: colors.accentTeal,
    fontSize: 11,
    textAlign: 'center',
  },
});
