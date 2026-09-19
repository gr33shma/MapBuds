/**
 * Search for a destination in Singapore using OneMap.
 *
 * Example:
 * searchDestination("Marina Bay Sands")
 *
 * Returns:
 * [
 *   {
 *     name: "...",
 *     address: "...",
 *     lat: 1.28,
 *     lng: 103.86
 *   }
 * ]
 */
export async function searchDestination(searchText, accessToken) {
  if (!searchText?.trim()) {
    return [];
  }

  if (!accessToken) {
    throw new Error('OneMap access token is required');
  }

  const url =
    `https://www.onemap.gov.sg/api/common/elastic/search` +
    `?searchVal=${encodeURIComponent(searchText)}` +
    `&returnGeom=Y` +
    `&getAddrDetails=Y` +
    `&pageNum=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: accessToken,
    },
  });

  if (!response.ok) {
    throw new Error(`OneMap search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.results || []).map((result) => ({
    name: result.SEARCHVAL,
    address: [
      result.BLK_NO,
      result.ROAD_NAME,
      result.BUILDING,
      result.POSTAL,
    ]
      .filter(Boolean)
      .join(' '),

    lat: Number(result.LATITUDE),
    lng: Number(result.LONGITUDE),
  }));
}