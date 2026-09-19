import * as Location from 'expo-location';

/**
 * Request permission to access the user's location.
 */
export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  return status === 'granted';
}

/**
 * Get the user's current location once.
 *
 * Output matches the shared MapBuds contract:
 * { lat, lng, timestamp }
 */
export async function getCurrentLocation() {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    timestamp: location.timestamp,
  };
}

/**
 * Continuously track the user's location.
 *
 * Every new location is returned as:
 * { lat, lng, timestamp }
 */
export async function watchUserLocation(onLocationUpdate) {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 5,
      timeInterval: 3000,
    },
    (location) => {
      const position = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        timestamp: location.timestamp,
      };

      onLocationUpdate(position);
    }
  );

  return subscription;
}