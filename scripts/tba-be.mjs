// Brumdrumherum – Baustellen Tiefbauamt Kanton Bern (TBA) in die App-Datei umwandeln
// Aufruf: node scripts/tba-be.mjs <Baustellen_TBA_BE.geojson> [tba-be.json]
// Liest den GeoJSON-Export des TBA (Koordinaten LV95, EPSG:2056), rechnet auf WGS84 um,
// verwirft abgeschlossene und abgelaufene Baustellen und schreibt tba-be.json im Format der Tabelle «incidents».
// Die App lädt die Datei direkt (index.html, loadTbaIncidents). Bei neuem Export den Aufruf wiederholen.
import { readFileSync, writeFileSync } from "node:fs";

// swisstopo, Näherungsformeln LV95 -> WGS84 (Genauigkeit unter 1 m)
export function lv95ToWgs84(E, N) {
  const y = (E - 2600000) / 1e6, x = (N - 1200000) / 1e6;
  const lon = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
  const lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x * x * x;
  return [+(lon * 100 / 36).toFixed(5), +(lat * 100 / 36).toFixed(5)];
}

const dist = (a, b) => Math.hypot((a[0] - b[0]) * 71000, (a[1] - b[1]) * 111000); // Meter, grob
// Punkte näher als 5 m weglassen (Datei klein halten), Anfang und Ende bleiben.
function thin(coords) {
  const out = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) if (dist(out[out.length - 1], coords[i]) >= 5) out.push(coords[i]);
  if (coords.length > 1) out.push(coords[coords.length - 1]);
  return out;
}

export function convert(geojson, today = new Date().toISOString().slice(0, 10)) {
  const stats = { total: geojson.features.length, abgeschlossen: 0, abgelaufen: 0, ohneTermin: 0, kept: 0 };
  const items = [];
  for (const f of geojson.features) {
    const p = f.properties, g = f.geometry;
    if (!g || !p.STATUS_BEZ || p.STATUS_BEZ === "Abgeschlossen") { stats.abgeschlossen++; continue; }
    if (!p.TERMINVON || !p.TERMINBIS) { stats.ohneTermin++; continue; }
    const start = p.TERMINVON.slice(0, 10), end = p.TERMINBIS.slice(0, 10);
    if (end < today) { stats.abgelaufen++; continue; }
    const raw = g.type === "Point" ? [g.coordinates] : g.coordinates;
    let pts = raw.map(c => lv95ToWgs84(c[0], c[1]));
    if (pts.length > 2) pts = thin(pts);
    const geometry = pts.length === 1 ? { type: "Point", coordinates: pts[0] } : { type: "LineString", coordinates: pts };
    const lat = pts.reduce((a, c) => a + c[1], 0) / pts.length, lon = pts.reduce((a, c) => a + c[0], 0) / pts.length;
    const ort = p.ORTSBEZEICHNUNG || (p.GEMEINDEN || "").split(",")[0].trim();
    const achse = (p.ACHSE || "").replace(/^\d+:\s*/, "");
    const title = [ort || achse, p.TYP_BEZ, p.VERKEHRSBEHINDERUNG_BEZ].filter(Boolean).join(": ").slice(0, 160);
    stats.kept++;
    items.push({
      source: "tba_be", external_id: String(p.ID), title,
      start_date: start, end_date: end,
      lat: +lat.toFixed(5), lon: +lon.toFixed(5), geometry,
      night_only: false, daily_from: null, daily_to: null,
      status: p.STATUS_BEZ, behinderung: p.VERKEHRSBEHINDERUNG_BEZ || null, achse
    });
  }
  return { stats, items };
}

if (process.argv[1] && process.argv[1].endsWith("tba-be.mjs") && !process.env.NO_MAIN) {
  const [, , inFile, outFile = "tba-be.json"] = process.argv;
  if (!inFile) { console.error("Aufruf: node scripts/tba-be.mjs <Baustellen_TBA_BE.geojson> [tba-be.json]"); process.exit(1); }
  const { stats, items } = convert(JSON.parse(readFileSync(inFile, "utf8")));
  writeFileSync(outFile, JSON.stringify({ created: new Date().toISOString(), stats, items }));
  console.log(stats, "->", outFile);
}
