'use strict';

// --- GeoJSON の URL ---
const GEOJSON_URL = "https://raw.githubusercontent.com/usagi-515/waypoint/main/waypoints.geojson";

// --- Leaflet 初期化 ---
const map = L.map('map').setView([35.0, 135.0], 5);
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  maxZoom: 15,
  attribution: "&copy; <a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
}).addTo(map);
map.zoomControl.setPosition('bottomleft');

// --- メイン処理 ---
async function loadAndPlot() {
  try {
    console.log('Fetching GeoJSON from:', GEOJSON_URL);
    const res = await fetch(GEOJSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();

    // マーカークラスタを準備
    const cluster = L.markerClusterGroup();

    // GeoJSONレイヤー
    const geojsonLayer = L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 4,
          weight: 1,
          color: '#e41a1c',
          fillColor: '#e41a1c',
          fillOpacity: 0.9
        });
      },
      onEachFeature: function (feature, layer) {
        if (feature.properties && feature.properties.name) {
          // ツールチップ（ラベル）
          layer.bindTooltip(feature.properties.name, {
            permanent: true,
            direction: "top",
            className: "map-label"
          });

          // 初期状態では閉じる
          layer.closeTooltip();

          // ズームイベントで開閉制御
          map.on("zoomend", function () {
            if (map.getZoom() >= 8) {
              layer.openTooltip();
            } else {
              layer.closeTooltip();
            }
          });
        }
      }
    });

    cluster.addLayer(geojsonLayer);
    map.addLayer(cluster);

    // 全体表示
    if (cluster.getLayers().length > 0) {
      map.fitBounds(cluster.getBounds().pad(0.1));
    }

    console.log(`Plotted ${cluster.getLayers().length} points.`);
  } catch (err) {
    console.error('loadAndPlot failed:', err);
    alert('GeoJSON 読み込みに失敗しました: ' + err.message);
  }
}

window.addEventListener('DOMContentLoaded', loadAndPlot);
