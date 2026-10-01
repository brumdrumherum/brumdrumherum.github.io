// Brumdrumherum – ASTRA-Baustellen Region Bern (Version 2)
// 1. Holt alle Verkehrsmeldungen von ASTRA (opentransportdata.swiss, DATEX II).
// 2. Holt die Autobahnanschlüsse der Region aus OpenStreetMap (offene Daten, ohne Schlüssel).
// 3. Behält Baustellen und Sperrungen, die einen Berner Anschluss nennen oder genaue Koordinaten in der Region haben.
// 4. Liest Zeitfenster wie «nachts 20:00 bis 05:00» aus dem Text.
// 5. Schreibt alles im Format der Xano-Tabelle «incidents» in astra-bern.json.
// Der ASTRA-Token kommt aus den GitHub Secrets (ASTRA_TOKEN) und wird nie ausgegeben.
import { writeFileSync } from "node:fs";

const ASTRA_URL = "https://api.opentransportdata.swiss/TDP/Soap_Datex2/TrafficSituations/Pull";
const SOAP_ACTION = "http://opentransportdata.swiss/TDP/Soap_Datex2/Pull/v1/pullTrafficMessages";
const BODY = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><d2LogicalModel xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" modelBaseVersion="2" xmlns="http://datex2.eu/schema/2/2_0"><exchange><supplierIdentification><country>ch</country><nationalIdentifier>FEDRO</nationalIdentifier></supplierIdentification><subscription><operatingMode>operatingMode1</operatingMode><subscriptionStartTime>2025-05-01T08:00:00.00+01:00</subscriptionStartTime><subscriptionState>active</subscriptionState><updateMethod>singleElementUpdate</updateMethod><target><address></address><protocol>http</protocol></target></subscription></exchange></d2LogicalModel></soap:Body></soap:Envelope>`;

// Region Bern (Rechteck). Gilt für die Anschlüsse aus OpenStreetMap und für Meldungen mit Koordinaten.
const BBOX = { latMin: 46.85, latMax: 47.06, lonMin: 7.28, lonMax: 7.62 };
const TYPES = ["MaintenanceWorks", "RoadOrCarriagewayOrLaneManagement", "ConstructionWorks"];
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const decode = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
const first = (re, s) => { const m = re.exec(s); return m ? decode(m[1]) : null; };
const all = (re, s) => [...s.matchAll(re)].map(m => decode(m[1]));
const norm = s => s.toLowerCase().replace(/^(anschluss|verzweigung|autobahndreieck|autobahnkreuz)\s+/g, "").replace(/[\s\-–.]+/g, "").replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ä/g, "ae");
const inBox = (la, lo) => la >= BBOX.latMin && la <= BBOX.latMax && lo >= BBOX.lonMin && lo <= BBOX.lonMax;

// --- Anschlüsse aus OpenStreetMap: Name -> Mittelpunkt aller Rampen mit diesem Namen ---
export function buildJunctions(osm) {
  const groups = new Map();
  for (const el of (osm.elements || [])) {
    const name = el.tags && (el.tags.name || el.tags["name:de"]);
    if (!name || el.lat == null) continue;
    const key = norm(name);
    if (!groups.has(key)) groups.set(key, { name, pts: [] });
    groups.get(key).pts.push([el.lat, el.lon]);
  }
  const out = new Map();
  for (const [key, g] of groups) {
    const lat = g.pts.reduce((a, p) => a + p[0], 0) / g.pts.length, lon = g.pts.reduce((a, p) => a + p[1], 0) / g.pts.length;
    out.set(key, { name: g.name, lat: +lat.toFixed(5), lon: +lon.toFixed(5), ramps: g.pts.length });
  }
  return out;
}
async function loadJunctions() {
  const q = `[out:json][timeout:30];node["highway"="motorway_junction"](${BBOX.latMin},${BBOX.lonMin},${BBOX.latMax},${BBOX.lonMax});out;`;
  const res = await fetch(OVERPASS_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Brumdrumherum-Studienprojekt-BFH" }, body: "data=" + encodeURIComponent(q) });
  if (!res.ok) throw new Error("OpenStreetMap (Overpass) antwortet mit " + res.status);
  return buildJunctions(await res.json());
}

// --- Namen von Anschlüssen aus dem Meldungstext ---
// Beispiele: «zwischen Anschluss Bern-Bethlehem und Anschluss Bern-Brünnen», «Anschluss Bern-Ostring», «Verzweigung Wankdorf»
export function junctionNames(text) {
  if (!text) return [];
  const names = [];
  const re = /(?:Anschluss|Verzweigung|Autobahndreieck Verzweigung)\s+(.+?)(?=\s+und\s+(?:Anschluss|Verzweigung)|\s+Sachlage|\s+Richtung|,|$)/g;
  for (const m of text.matchAll(re)) names.push(m[1].trim());
  return names;
}

// --- Zeitfenster aus dem Text, z.B. «Dauer: nachts voraussichtlich 20.10.2026 20:00 bis 21.10.2026 05:00» ---
export function timeWindow(text) {
  if (!text) return { night_only: false, daily_from: null, daily_to: null };
  const dauer = (text.split("Dauer:")[1] || "").split("Empfehlung:")[0];
  const night = /\bnachts\b/i.test(dauer);
  const times = [...dauer.matchAll(/(\d{1,2}:\d{2})/g)].map(m => m[1].padStart(5, "0"));
  return { night_only: night, daily_from: night && times[0] ? times[0] : null, daily_to: night && times[1] ? times[1] : null };
}

export function parse(xml, junctions) {
  const parts = xml.split("<dx223:situationRecord ").slice(1);
  const stats = { total: parts.length, byType: {}, kept: 0, viaJunction: 0, viaCoords: 0, nightOnly: 0 };
  const unknownBernNames = new Map();
  const items = [];
  for (const rec of parts) {
    const type = first(/^[^>]*xsi:type="dx223:([A-Za-z]+)"/, rec) || "unbekannt";
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    if (!TYPES.includes(type)) continue;
    const description = first(/<dx223:generalPublicComment[\s\S]*?lang="de-CH">([\s\S]*?)<\/dx223:value>/, rec);
    const addresses = all(/TpegOtherPointDescriptor"[\s\S]*?lang="de-CH">([\s\S]*?)<\/dx223:value>/g, rec);
    const lats = all(/<dx223:latitude[^>]*>([-\d.]+)</g, rec).map(Number);
    const lons = all(/<dx223:longitude[^>]*>([-\d.]+)</g, rec).map(Number);

    // Weg B: Anschlüsse im Text, die es in der Region Bern gibt
    const names = junctionNames(description);
    const found = names.map(n => junctions.get(norm(n))).filter(Boolean);
    names.filter(n => /^bern[\s-]/i.test(n) && !junctions.get(norm(n))).forEach(n => unknownBernNames.set(n, (unknownBernNames.get(n) || 0) + 1));

    // Weg A: genaue Koordinaten (mind. 3 Nachkommastellen) in der Region und eine Adresse mit Hausnummer
    const precise = lats.map((la, i) => [la, lons[i]]).filter(([la, lo]) => inBox(la, lo) && String(la).split(".")[1]?.length >= 3);
    const streetAddress = addresses.find(a => /\d/.test(a.split(",")[0] || ""));

    let geometry = null, via = null;
    if (found.length >= 2) { geometry = { type: "LineString", coordinates: [[found[0].lon, found[0].lat], [found[1].lon, found[1].lat]] }; via = "Anschlüsse"; }
    else if (found.length === 1) { geometry = { type: "Point", coordinates: [found[0].lon, found[0].lat] }; via = "Anschluss"; }
    else if (precise.length && streetAddress) { geometry = precise.length > 1 ? { type: "LineString", coordinates: precise.map(([la, lo]) => [lo, la]) } : { type: "Point", coordinates: [precise[0][1], precise[0][0]] }; via = "Koordinaten"; }
    if (!geometry) continue;

    const coords = geometry.type === "Point" ? [geometry.coordinates] : geometry.coordinates;
    const lat = coords.reduce((a, c) => a + c[1], 0) / coords.length, lon = coords.reduce((a, c) => a + c[0], 0) / coords.length;
    const win = timeWindow(description);
    const start = first(/<dx223:overallStartTime[^>]*>([^<]+)</, rec);
    const end = first(/<dx223:endOfPeriod[^>]*>([^<]+)</, rec) || first(/<dx223:overallEndTime[^>]*>([^<]+)</, rec);
    const title = (description || streetAddress || "ASTRA-Meldung").replace(/^Freigegeben:\s*/, "").split(" Sachlage:")[0].slice(0, 160);

    stats.kept++; via === "Koordinaten" ? stats.viaCoords++ : stats.viaJunction++; if (win.night_only) stats.nightOnly++;
    items.push({
      source: "astra",
      external_id: first(/^[^>]*\bid="([^"]+)"/, rec),
      title,
      start_date: start ? start.slice(0, 10) : null,
      end_date: end ? end.slice(0, 10) : null,
      lat: +lat.toFixed(5), lon: +lon.toFixed(5),
      geometry,
      night_only: win.night_only, daily_from: win.daily_from, daily_to: win.daily_to,
      _info: { type, via, junctions: found.map(j => j.name), description: (description || "").slice(0, 300) }
    });
  }
  return { stats, items, unknownBernNames: [...unknownBernNames.entries()] };
}

export async function main() {
  const token = process.env.ASTRA_TOKEN;
  if (!token) { console.error("Fehler: ASTRA_TOKEN fehlt. Bitte in den GitHub Secrets anlegen."); process.exit(1); }

  const tj = Date.now();
  const junctions = await loadJunctions();
  console.log(`OpenStreetMap: ${junctions.size} Autobahnanschlüsse in der Region Bern geladen (${((Date.now() - tj) / 1000).toFixed(1)} s)`);

  const t0 = Date.now();
  const res = await fetch(ASTRA_URL, { method: "POST", headers: { "Authorization": "Bearer " + token, "SOAPAction": SOAP_ACTION, "Content-Type": "text/xml; charset=utf-8" }, body: BODY });
  const xml = await res.text();
  console.log(`ASTRA: HTTP ${res.status}, ${(xml.length / 1e6).toFixed(1)} Mio. Zeichen, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!res.ok) { console.error("Abruf fehlgeschlagen. Anfang der Antwort:\n" + xml.slice(0, 500)); process.exit(1); }

  const { stats, items, unknownBernNames } = parse(xml, junctions);
  console.log(`\nMeldungen total: ${stats.total}`);
  console.log(`Baustellen und Sperrungen Region Bern: ${stats.kept} (über Anschlüsse: ${stats.viaJunction}, über Koordinaten: ${stats.viaCoords})`);
  console.log(`  davon nur nachts: ${stats.nightOnly} (lösen keine Morgen-Warnung aus)`);

  console.log("\n================ Treffer ================");
  items.forEach((i, n) => {
    console.log(`\n#${n + 1} ${i.title}`);
    console.log(`  ${i.start_date} bis ${i.end_date || "offen"}${i.night_only ? `, NUR NACHTS ${i.daily_from || "?"}–${i.daily_to || "?"}` : ", ganztags"}`);
    console.log(`  Verortung: ${i._info.via}${i._info.junctions.length ? " (" + i._info.junctions.join(" → ") + ")" : ""}, Mitte ${i.lat}, ${i.lon}`);
  });

  console.log("\n================ Anschlüsse aus OpenStreetMap (bitte stichprobenartig prüfen) ================");
  [...junctions.values()].sort((a, b) => a.name.localeCompare(b.name)).forEach(j =>
    console.log(`  ${j.name}: ${j.lat}, ${j.lon}  https://www.openstreetmap.org/?mlat=${j.lat}&mlon=${j.lon}#map=16/${j.lat}/${j.lon}`));
  if (unknownBernNames.length) {
    console.log("\nAnschlüsse mit «Bern» im Namen, die in OpenStreetMap nicht gefunden wurden:");
    unknownBernNames.forEach(([n, c]) => console.log(`  ${n} (${c}×)`));
  }

  writeFileSync("astra-bern.json", JSON.stringify({ created: new Date().toISOString(), stats, items }, null, 1));
  console.log("\nAlle Treffer im Format der Tabelle «incidents» sind als Datei astra-bern.json unter «Artifacts» gespeichert.");
  await sendToXano(items);
}

// --- An Xano senden: geschützte Schnittstelle POST /astra (Gruppe «cron») ---
// XANO_URL ist nicht geheim (steht im Workflow). CRON_SECRET kommt aus den GitHub Secrets.
async function sendToXano(items) {
  const url = process.env.XANO_URL, secret = process.env.CRON_SECRET;
  if (!url || !secret) { console.log("\nXano: nicht gesendet (XANO_URL oder CRON_SECRET fehlt)."); return; }
  const payload = items.map(({ _info, ...rest }) => rest);
  const res = await fetch(url.replace(/\/$/, "") + "/astra", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Cron-Secret": secret },
    body: JSON.stringify({ items: payload })
  });
  const text = await res.text();
  console.log(`\nXano: HTTP ${res.status} ${text.slice(0, 300)}`);
  if (!res.ok) process.exit(1);
}

if (!process.env.NO_MAIN) main().catch(e => { console.error("Fehler:", e.message); process.exit(1); });
