'use strict';

// --- 設定 ---
const SHEET_ID = '1IGYhIKXx1sqM27yYP_DdV2jlQRnl9o8cS3DK89PJSBs'; // ←あなたのID
const SHEET_GID = 0; // シートが複数あるなら該当の gid に変更
// gviz形式のCSV URL（Publish to web を行っていれば確実）
//  const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
 const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdAU5tsevNF4DiYewz1Oht7_f0pA6qpQR2jEdG9zb-SW9rgoxOa6wvIpD6Zhkpdd1A39WJguSqHMte/pub?gid=0&single=true&output=csv";


// --- Leaflet 初期化 ---
const LAT = 35.7;
const LON = 139.8;
const ZOOM = 5;
const map = L.map('map').setView([LAT, LON], ZOOM);
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  maxZoom: 15,
  attribution: "&copy; <a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a> contributors"
}).addTo(map);
map.zoomControl.setPosition('bottomleft');

// --- シンプルな CSV パーサ（引用符付き対応） ---
function parseCSV(text) {
  // CR 削除、BOM 削除
  text = text.replace(/\r/g, '');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.trim().split('\n');
  const rows = lines.map(line => {
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        if (inQuotes && line[i + 1] === '"') { // "" -> "
          cur += '"'; i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  });
  return rows;
}

// --- CSV を取得して地図に描画 ---
async function loadAndPlot() {
  try {
    console.log('Fetching CSV from:', CSV_URL);
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      const txt = await res.text().catch(()=>'');
      throw new Error(`HTTP ${res.status} ${res.statusText} — response: ${txt}`);
    }
    const text = await res.text();
    const rows = parseCSV(text);

    if (rows.length <= 1) {
      console.warn('CSV has no data rows');
      return;
    }

    // ヘッダ検出（name,lat,lon 期待）
    const header = rows[0].map(h => h.toLowerCase());
    const nameIdx = header.indexOf('name') >= 0 ? header.indexOf('name') : 0;
    const latIdx = header.indexOf('lat') >= 0 ? header.indexOf('lat') : 1;
    const lonIdx = header.indexOf('lon') >= 0 ? header.indexOf('lon') : 2;

    const dataRows = rows.slice(1);

    const bounds = L.latLngBounds([]);
    let count = 0;
    dataRows.forEach(r => {
      // 行が短い場合はスキップ
      if (r.length <= Math.max(nameIdx, latIdx, lonIdx)) return;

      const name = r[nameIdx] || '';
      const lat = parseFloat(r[latIdx]);
      const lon = parseFloat(r[lonIdx]);

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const marker = L.circleMarker([lat, lon], {
          radius: 3,
          weight: 1,
          fillOpacity: 0.9,
          color: '#1f78b4',
          fillColor: '#1f78b4'
        }).addTo(map);

        // 常時表示ラベル
        marker.bindTooltip(name || '(no name)', { permanent: true, direction: 'right', offset: [6, 0] }).openTooltip();

        bounds.extend([lat, lon]);
        count++;
      } else {
        // 緯度経度が数値でない場合のログ（デバッグ用）
        console.warn('skip row (lat/lon invalid):', r);
      }
    });

    console.log(`Plotted ${count} points.`);

    // 全点が見えるようにズーム/センタリング
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.1));
    } else {
      console.warn('bounds invalid — not changing view');
    }

  } catch (err) {
    console.error('Failed to load CSV:', err);
    alert('CSV の読み込みに失敗しました。コンソールのエラーメッセージを確認してください。');
  }
}

// 起動
window.addEventListener('DOMContentLoaded', () => {
  loadAndPlot();
});
