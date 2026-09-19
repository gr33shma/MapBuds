import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

// Builds the HTML page that runs inside the WebView. Leaflet + raw
// OpenStreetMap tiles, loaded from a CDN — no API key, no billing,
// no card required anywhere in this file.
//
// Friends are now dynamic: rather than one hardcoded friend marker,
// the map keeps a JS object of markers keyed by friendId, so any
// number of real friends (from Firebase) can be shown/removed live.
function buildHtml({ initialLat, initialLng, meEmoji }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0F1B33; }
    .emoji-pin { font-size: 28px; line-height: 1; text-align: center; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([${initialLat}, ${initialLng}], 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    function emojiIcon(emoji) {
      return L.divIcon({
        html: '<div class="emoji-pin">' + emoji + '</div>',
        iconSize: [30, 30],
        className: ''
      });
    }

    var meMarker = L.marker([${initialLat}, ${initialLng}], { icon: emojiIcon('${meEmoji}') }).addTo(map);
    var friendMarkers = {}; // friendId -> L.marker
    var landmarkMarkers = {}; // landmark name -> L.marker (optional, lightweight)

    var routeLayer = null;
var destinationMarker = null;

function drawRoute(coordinates, destinationLat, destinationLng) {
  // Remove the previous route if one exists
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  // Remove the previous destination marker
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }

  if (!coordinates || coordinates.length === 0) {
    return;
  }

  // Draw the route
  routeLayer = L.polyline(coordinates, {
    weight: 6,
    opacity: 0.9
  }).addTo(map);

  // Mark the destination
  destinationMarker = L.marker([
    destinationLat,
    destinationLng
  ]).addTo(map);

  // Automatically zoom so the whole route is visible
  map.fitBounds(routeLayer.getBounds(), {
    padding: [40, 40]
  });
}

function clearRoute() {
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  if (destinationMarker) {
    map.removeLayer(destinationMarker);
    destinationMarker = null;
  }
}

    function updateMyPosition(lat, lng) {
      meMarker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
    }

    function updateMySkin(emoji) {
      meMarker.setIcon(emojiIcon(emoji));
    }

    // Called once per friend per location update. Creates the marker
    // the first time a given friendId is seen, moves it on every
    // update after that.
    function upsertFriend(friendId, lat, lng, emoji) {
      if (friendMarkers[friendId]) {
        friendMarkers[friendId].setLatLng([lat, lng]);
      } else {
        friendMarkers[friendId] = L.marker([lat, lng], { icon: emojiIcon(emoji) }).addTo(map);
      }
    }

    // Called when a friend goes offline / stops sharing location.
    function removeFriend(friendId) {
      if (friendMarkers[friendId]) {
        map.removeLayer(friendMarkers[friendId]);
        delete friendMarkers[friendId];
      }
    }

    window.updateMyPosition = updateMyPosition;
    window.updateMySkin = updateMySkin;
    window.upsertFriend = upsertFriend;
    window.removeFriend = removeFriend;
    window.drawRoute = drawRoute;
    window.clearRoute = clearRoute;
  </script>
</body>
</html>
`;
}

// Exposes imperative methods to the parent screen via a ref, so
// MapScreen can drive the map from real Firebase data.
const MapWebView = forwardRef(function MapWebView({ initialLat, initialLng, meSkinEmoji }, ref) {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    updateMyPosition(lat, lng) {
      webViewRef.current?.injectJavaScript(`window.updateMyPosition(${lat}, ${lng}); true;`);
    },
    updateMySkin(emoji) {
      webViewRef.current?.injectJavaScript(`window.updateMySkin('${emoji}'); true;`);
    },
    upsertFriend(friendId, lat, lng, emoji) {
      webViewRef.current?.injectJavaScript(
        `window.upsertFriend('${friendId}', ${lat}, ${lng}, '${emoji}'); true;`
      );
    },
    removeFriend(friendId) {
      webViewRef.current?.injectJavaScript(`window.removeFriend('${friendId}'); true;`);
    },
    drawRoute(coordinates, destinationLat, destinationLng) {
      const coordsJson = JSON.stringify(coordinates);

      webViewRef.current?.injectJavaScript(
        `window.drawRoute(${coordsJson}, ${destinationLat}, ${destinationLng}); true;`
      );
    },

    clearRoute() {
      webViewRef.current?.injectJavaScript(
        `window.clearRoute(); true;`
      );
    },
  }));

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html: buildHtml({ initialLat, initialLng, meEmoji: meSkinEmoji }) }}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      javaScriptEnabled
      domStorageEnabled
    />
  );
});

export default MapWebView;
