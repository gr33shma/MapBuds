/**
 * Get a route between two locations using OneMap.
 *
 * origin/destination:
 * { lat, lng }
 *
 * routeType:
 * "walk" | "drive" | "cycle"
 */
export async function getRoute(
  origin,
  destination,
  routeType,
  accessToken
) {
  if (!origin || !destination) {
    throw new Error('Origin and destination are required');
  }

  if (!accessToken) {
    throw new Error('OneMap access token is required');
  }

  const start = `${origin.lat},${origin.lng}`;
  const end = `${destination.lat},${destination.lng}`;

  const url =
    `https://www.onemap.gov.sg/api/public/routingsvc/route` +
    `?start=${encodeURIComponent(start)}` +
    `&end=${encodeURIComponent(end)}` +
    `&routeType=${encodeURIComponent(routeType)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: accessToken,
    },
  });

  if (!response.ok) {
    throw new Error(`OneMap routing failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.route_summary) {
    throw new Error(data.status_message || 'No route found');
  }

  return {
    distanceMeters: data.route_summary.total_distance,
    durationSeconds: data.route_summary.total_time,
    geometry: data.route_geometry,
    instructions: data.route_instructions || [],
    raw: data,
  };
}

/**
 * Get public transport routes.
 *
 * mode:
 * "transit" | "bus" | "rail"
 *
 * departureTime:
 * optional "HH:MM:SS" override for testing/planned journeys.
 * If omitted, the current time is used.
 */
export async function getPublicTransportRoute(
  origin,
  destination,
  accessToken,
  mode = 'transit',
  departureTime = null
) {
  if (!origin || !destination) {
    throw new Error('Origin and destination are required');
  }

  if (!accessToken) {
    throw new Error('OneMap access token is required');
  }

  const now = new Date();

  const date =
    `${String(now.getMonth() + 1).padStart(2, '0')}-` +
    `${String(now.getDate()).padStart(2, '0')}-` +
    `${now.getFullYear()}`;

  const currentTime =
    `${String(now.getHours()).padStart(2, '0')}:` +
    `${String(now.getMinutes()).padStart(2, '0')}:` +
    `${String(now.getSeconds()).padStart(2, '0')}`;

  const time = departureTime || currentTime;

  const start = `${origin.lat},${origin.lng}`;
  const end = `${destination.lat},${destination.lng}`;

  const url =
    `https://www.onemap.gov.sg/api/public/routingsvc/route` +
    `?start=${encodeURIComponent(start)}` +
    `&end=${encodeURIComponent(end)}` +
    `&routeType=pt` +
    `&date=${encodeURIComponent(date)}` +
    `&time=${encodeURIComponent(time)}` +
    `&mode=${encodeURIComponent(mode)}` +
    `&numItineraries=3`;

  const response = await fetch(url, {
    headers: {
      Authorization: accessToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      `OneMap public transport routing failed: ${response.status}`
    );
  }

  return response.json();
}