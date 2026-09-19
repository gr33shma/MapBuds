// services/landmarks.js
//
// Owns: fetching real landmark facts from Wikipedia's GeoSearch API,
// and deciding WHEN to fire the landmark popup as the user moves.
//
// Output contract (agreed with Person 2, see components/LandmarkModal.js):
//   { name, fact, lat, lng }
// Nothing downstream of fetchNearbyLandmarks() needs to change this shape.

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

/**
 * Great-circle distance between two {lat, lng} points, in meters.
 */
export function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Fetch landmarks near a coordinate from Wikipedia's GeoSearch API.
 * Single request: geosearch as a generator + extracts + coordinates,
 * so we get short summaries in one round trip.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{radiusMeters?: number, limit?: number}} opts
 * @returns {Promise<Array<{name, fact, lat, lng, pageid, distanceMeters}>>}
 */
export async function fetchNearbyLandmarks(lat, lng, opts = {}) {
  const { radiusMeters = 250, limit = 5 } = opts;

  // Wikipedia's geosearch radius is capped at 10000m; clamp defensively.
  const radius = Math.min(Math.max(radiusMeters, 10), 10000);

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(radius),
    ggslimit: String(limit),
    prop: 'extracts|coordinates',
    exintro: '1',
    explaintext: '1',
    exchars: '280',
    origin: '*', // required for CORS when calling from a browser/WebView context
  });

  let data;
  try {
    const res = await fetch(`${WIKI_API}?${params.toString()}`, {
      headers: {
        // Wikipedia's API rejects requests with no identifying header
        // (returns 403). This is a documented Wikimedia policy, not
        // something specific to this app — see
        // https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
        'User-Agent': 'MapBuds/1.0 (student hackathon project)',
        'Api-User-Agent': 'MapBuds/1.0 (student hackathon project)',
      },
    });
    if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);
    data = await res.json();
  } catch (err) {
    // Never let a flaky network call crash navigation. Log and return
    // nothing; the tracker below just won't trigger a popup this cycle.
    console.warn('[landmarks] fetchNearbyLandmarks failed:', err.message);
    return [];
  }

  const pages = data?.query?.pages;
  if (!pages) return [];

  const landmarks = Object.values(pages)
    .filter((p) => p.coordinates?.[0])
    .map((p) => {
      const coord = p.coordinates[0];
      const point = { lat: coord.lat, lng: coord.lon };
      return {
        pageid: p.pageid,
        name: p.title,
        fact: (p.extract || '').trim() || `${p.title} is a nearby point of interest.`,
        lat: point.lat,
        lng: point.lng,
        distanceMeters: haversineMeters({ lat, lng }, point),
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  return landmarks;
}

/**
 * Stateful tracker that decides when to fire the landmark popup as the
 * user's position updates. This is the "landmark trigger logic" the
 * integration doc calls out — it replaces the hardcoded coordinate-match
 * block in MapScreen.js's useEffect.
 *
 * Usage in MapScreen.js (at integration):
 *   const tracker = useRef(createLandmarkTracker()).current;
 *   useEffect(() => {
 *     tracker.update(myPosition).then((landmark) => {
 *       if (landmark) {
 *         setMockLandmarkReplacement(landmark); // pass into LandmarkModal
 *         setLandmarkVisible(true);
 *       }
 *     });
 *   }, [stepIndex]);
 *
 * @param {{radiusMeters?: number, triggerRadiusMeters?: number, refetchDistanceMeters?: number}} opts
 */
export function createLandmarkTracker(opts = {}) {
  const {
    radiusMeters = 250,        // how far to search when we fetch
    triggerRadiusMeters = 40,  // how close the user must be to fire the popup
    refetchDistanceMeters = 150, // re-query Wikipedia once user drifts this far from last fetch point
  } = opts;

  let cachedLandmarks = [];
  let lastFetchPos = null;
  const triggeredIds = new Set();

  async function update(position) {
    const needsRefetch =
      !lastFetchPos || haversineMeters(lastFetchPos, position) > refetchDistanceMeters;

    if (needsRefetch) {
      cachedLandmarks = await fetchNearbyLandmarks(position.lat, position.lng, {
        radiusMeters,
      });
      lastFetchPos = position;
    }

    for (const landmark of cachedLandmarks) {
      if (triggeredIds.has(landmark.pageid)) continue;
      const distance = haversineMeters(position, landmark);
      if (distance <= triggerRadiusMeters) {
        triggeredIds.add(landmark.pageid);
        // Strip internal fields before handing to the UI contract.
        const { pageid, distanceMeters, ...uiContract } = landmark;
        return uiContract; // { name, fact, lat, lng }
      }
    }

    return null;
  }

  function reset() {
    cachedLandmarks = [];
    lastFetchPos = null;
    triggeredIds.clear();
  }

  return { update, reset };
}
