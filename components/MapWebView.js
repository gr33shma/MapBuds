import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { avatarSkins } from '../utils/mockData';

// Builds the HTML page that runs inside the WebView. Leaflet + raw
// OpenStreetMap tiles, loaded straight from a CDN — no API key, no
// Google Cloud project, no billing account, no card required anywhere
// in this file.
function buildHtml({ initialLat, initialLng, meEmoji, friendEmoji }) {
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
    var friendMarker = L.marker([${initialLat}, ${initialLng}], { icon: emojiIcon('${friendEmoji}') }).addTo(map);

    // Called from React Native via injectJavaScript whenever positions change.
    function updatePositions(meLat, meLng, friendLat, friendLng) {
      meMarker.setLatLng([meLat, meLng]);
      friendMarker.setLatLng([friendLat, friendLng]);
      map.panTo([meLat, meLng]);
    }

    function updateMySkin(emoji) {
      meMarker.setIcon(emojiIcon(emoji));
    }

    window.updatePositions = updatePositions;
    window.updateMySkin = updateMySkin;
  </script>
</body>
</html>
`;
}

// Exposes updatePositions(...) and updateMySkin(...) to the parent
// screen via a ref, so MapScreen can drive the map the same way it
// would drive native markers.
const MapWebView = forwardRef(function MapWebView(
  { initialLat, initialLng, meSkinId, friendSkinId },
  ref
) {
  const webViewRef = useRef(null);
  const meEmoji = (avatarSkins.find((s) => s.id === meSkinId) || avatarSkins[0]).emoji;
  const friendEmoji = (avatarSkins.find((s) => s.id === friendSkinId) || avatarSkins[0]).emoji;

  useImperativeHandle(ref, () => ({
    updatePositions(meLat, meLng, friendLat, friendLng) {
      webViewRef.current?.injectJavaScript(
        `window.updatePositions(${meLat}, ${meLng}, ${friendLat}, ${friendLng}); true;`
      );
    },
    updateMySkin(emoji) {
      webViewRef.current?.injectJavaScript(`window.updateMySkin('${emoji}'); true;`);
    },
  }));

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html: buildHtml({ initialLat, initialLng, meEmoji, friendEmoji }) }}
      style={{ flex: 1, backgroundColor: 'transparent' }}
      javaScriptEnabled
      domStorageEnabled
    />
  );
});

export default MapWebView;
