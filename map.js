'use strict';

// --- 公開GeoJSONのURL ---
const GEOJSON_URL = "https://raw.githubusercontent.com/usagi-515/waypoint/main/waypoints.geojson";

// --- Leaflet 初期化 ---
const map = L.map('map').setView([35.0, 135.0], 5);
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  maxZoom: 15,
  attribution: "&copy; <a href='https://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>"
}).addTo(map);
map.zoomControl.setPosition('bottomleft');

// --- メイン処理 ---
async function loadAndPlot() {
  try {
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const geojson = await res.json();

    // マーカークラスタ
    const cluster = L.markerClusterGroup();

    // GeoJSON を Leaflet レイヤーに変換
    const layer = L.geoJSON(geojson, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 4,
          weight: 1,
          color: '#e41a1c',
          fillColor: '#e41a1c',
          fillOpacity: 0.9
        }).bindTooltip(feature.properties.name || '(no name)', { direction: 'top' });
      }
    });

    const geojsonLayer = L.geoJSON(data, {
  onEachFeature: function (feature, layer) {
    if (feature.properties && feature.properties.name) {
      layer.bindTooltip(feature.properties.name, {
        permanent: true,
        direction: "top",
        className: "map-label"
      }).openTooltip(); // 初期状態で表示

      // デフォルトでは非表示
      layer.closeTooltip();

      map.on("zoomend", function () {
        if (map.getZoom() >= 8) {
          layer.openTooltip();
        } else {
          layer.closeTooltip();
        }
      });
    }
  }
}).addTo(map);


    cluster.addLayer(layer);
    map.addLayer(cluster);

    if (cluster.getLayers().length > 0) {
      map.fitBounds(cluster.getBounds().pad(0.1));
    }

    console.log(`Plotted ${cluster.getLayers().length} points from GeoJSON.`);
  } catch (err) {
    console.error('loadAndPlot failed:', err);
    alert('GeoJSON 読み込みに失敗しました: ' + err.message);
  }
}

window.addEventListener('DOMContentLoaded', loadAndPlot);
