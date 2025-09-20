'use strict';

// --- 公開CSV の URL（あなたの公開URLをそのまま） ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdAU5tsevNF4DiYewz1Oht7_f0pA6qpQR2jEdG9zb-SW9rgoxOa6wvIpD6Zhkpdd1A39WJguSqHMte/pub?gid=0&single=true&output=csv";

// --- Leaflet 初期化 ---
const map = L.map('map').setView([35.0, 135.0], 5);
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  maxZoom: 15,
  attribution: "&copy; <a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a> contributors"
}).addTo(map);
map.zoomControl.setPosition('bottomleft');

// --- DMS (例: 242621.02N) を小数度に変換 ---
function dmsToDecimal(dms) {
  if (!dms) return null;
  dms = String(dms).trim();
  // 例: 242621.02N または 1231508.36E
  const m = dms.match(/^(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)([NSEW])$/i);
  if (!m) {
    console.warn('DMS parse failed:', dms);
    return null;
  }
  const deg = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseFloat(m[3]);
  let dec = deg + min / 60 + sec / 3600;
  const dir = m[4].toUpperCase();
  if (dir === 'S' || dir === 'W') dec = -dec;
  return dec;
}

// --- CSV をパース（PapaParse がある場合はそれを使う） ---
function parseCsvTextToObjects(text) {
  // trim BOM/CR
  text = text.replace(/\r/g, '');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  if (typeof Papa !== 'undefined') {
    const res = Papa.parse(text, { header: true, skipEmptyLines: true });
    return res.data;
  }
  // 簡易パース（ヘッダあり・カンマ区切り）
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] !== undefined ? cols[i] : '');
    return obj;
  });
}

// --- メイン処理 ---
async function loadAndPlot() {
  try {
    console.log('Fetching CSV from:', CSV_URL);
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();

    const rows = parseCsvTextToObjects(text);
    console.log('CSV rows loaded:', rows.length);

    const markers = [];
    rows.forEach((row, idx) => {
      // CSV の列名に合わせて安全に参照
      const rawLat = row['row.Lat'] || row['row.lat'] || row['Lat'] || row['lat'] || row['row.Lat '];
      const rawLon = row['row.Lon'] || row['row.lon'] || row['Lon'] || row['lon'] || row['row.Lon '];
      const name = row['name'] || row['Name'] || `pt${idx+1}`;

      const lat = dmsToDecimal(rawLat);
      const lon = dmsToDecimal(rawLon);

      // ログを必ず出す（デバッグ用）
      console.log(`ROW[${idx}]`, { name, rawLat, rawLon, lat, lon });

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        // 視認性高めのスタイルにする（確実に目に付く）
        const m = L.circleMarker([lat, lon], {
          radius: 2,            // ← 大きめにしてまずは見えるように
          weight: 1,
          color: '#e41a1c',    // 枠色
          fillColor: '#e41a1c',// 塗り
          fillOpacity: 0.95
        }).addTo(map);

        // 常時表示ラベル（今はデバッグなので permanent: true）
        m.bindTooltip(name || '(no name)', { permanent: true, direction: 'right', offset: [8, 0] }).openTooltip();

        markers.push(m);
      } else {
        // 無効な行はコンソールに記録
        console.warn('skip invalid lat/lon row:', idx, row);
      }
    });

    console.log(`Plotted ${markers.length} points.`);

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      console.warn('No valid markers to fit bounds.');
    }
  } catch (err) {
    console.error('loadAndPlot failed:', err);
    alert('CSV 読み込みに失敗しました（コンソール参照）: ' + err.message);
  }
}

window.addEventListener('DOMContentLoaded', loadAndPlot);
