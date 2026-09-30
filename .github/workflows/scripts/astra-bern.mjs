// Brumdrumherum – ASTRA-Test Region Bern
// Holt alle Verkehrsmeldungen von ASTRA (opentransportdata.swiss, DATEX II),
// behält Baustellen und Sperrungen in der Region Bern und schreibt eine Übersicht ins Protokoll.
// Der Token kommt aus den GitHub Secrets (ASTRA_TOKEN) und wird nie ausgegeben.
import { writeFileSync } from "node:fs";

const URL_API = "https://api.opentransportdata.swiss/TDP/Soap_Datex2/TrafficSituations/Pull";
const SOAP_ACTION = "http://opentransportdata.swiss/TDP/Soap_Datex2/Pull/v1/pullTrafficMessages";
const BODY = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><d2LogicalModel xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" modelBaseVersion="2" xmlns="http://datex2.eu/schema/2/2_0"><exchange><supplierIdentification><country>ch</country><nationalIdentifier>FEDRO</nationalIdentifier></supplierIdentification><subscription><operatingMode>operatingMode1</operatingMode><subscriptionStartTime>2025-05-01T08:00:00.00+01:00</subscriptionStartTime><subscriptionState>active</subscriptionState><updateMethod>singleElementUpdate</updateMethod><target><address></address><protocol>http</protocol></target></subscription></exchange></d2LogicalModel></soap:Body></soap:Envelope>`;

// Region Bern: Stichwörter im Text ODER Koordinaten in diesem Rechteck
const KEYWORDS = ["Bern", "Wankdorf", "Bümpliz", "Bethlehem", "Forsthaus", "Neufeld", "Felsenau", "Ostring", "Muri", "Weyermannshaus", "Köniz", "Ostermundigen", "Grauholz", "Schönbühl", "Ittigen", "Wabern", "Niederwangen", "Brünnen", "Liebefeld"];
const BBOX = { latMin: 46.85, latMax: 47.05, lonMin: 7.25, lonMax: 7.65 };
const TYPES = ["MaintenanceWorks", "RoadOrCarriagewayOrLaneManagement"];

const decode = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
const first = (re, s) => { const m = re.exec(s); return m ? decode(m[1]) : null; };
const all = (re, s) => [...s.matchAll(re)].map(m => decode(m[1]));

export function parse(xml) {
  const parts = xml.split("<dx223:situationRecord ").slice(1);
  const stats = { total: parts.length, byType: {}, kept: 0 };
  const items = [];
  for (const rec of parts) {
    const type = first(/^[^>]*xsi:type="dx223:([A-Za-z]+)"/, rec) || "unbekannt";
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    if (!TYPES.includes(type)) continue;
    const description = first(/<dx223:generalPublicComment[\s\S]*?lang="de-CH">([\s\S]*?)<\/dx223:value>/, rec);
    const addresses = all(/TpegOtherPointDescriptor"[\s\S]*?lang="de-CH">([\s\S]*?)<\/dx223:value>/g, rec);
    const lats = all(/<dx223:latitude[^>]*>([-\d.]+)</g, rec).map(Number);
    const lons = all(/<dx223:longitude[^>]*>([-\d.]+)</g, rec).map(Number);
    const tmc = all(/<dx223:specificLocation[^>]*>(\d+)</g, rec);
    const text = [description || "", ...addresses].join(" ");
    const byKeyword = KEYWORDS.find(k => text.includes(k)) || null;
    const byCoords = lats.some((la, i) => la >= BBOX.latMin && la <= BBOX.latMax && lons[i] >= BBOX.lonMin && lons[i] <= BBOX.lonMax);
    if (!byKeyword && !byCoords) continue;
    stats.kept++;
    items.push({
      id: first(/^[^>]*\bid="([^"]+)"/, rec),
      type,
      status: first(/<dx223:validityStatus[^>]*>([^<]+)</, rec),
      start: first(/<dx223:overallStartTime[^>]*>([^<]+)</, rec),
      end: first(/<dx223:endOfPeriod[^>]*>([^<]+)</, rec) || first(/<dx223:overallEndTime[^>]*>([^<]+)</, rec),
      description, addresses, lats, lons, tmc,
      match: byCoords ? "Koordinaten" : "Stichwort: " + byKeyword
    });
  }
  return { stats, items };
}

export async function main() {
  const token = process.env.ASTRA_TOKEN;
  if (!token) { console.error("Fehler: ASTRA_TOKEN fehlt. Bitte in den GitHub Secrets anlegen."); process.exit(1); }
  const t0 = Date.now();
  const res = await fetch(URL_API, {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "SOAPAction": SOAP_ACTION, "Content-Type": "text/xml; charset=utf-8" },
    body: BODY
  });
  const xml = await res.text();
  console.log(`HTTP-Status: ${res.status}, Grösse: ${(xml.length / 1e6).toFixed(1)} Mio. Zeichen, Abruf: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!res.ok) { console.error("Abruf fehlgeschlagen. Anfang der Antwort:\n" + xml.slice(0, 500)); process.exit(1); }

  const t1 = Date.now();
  const { stats, items } = parse(xml);
  console.log(`Verarbeitung: ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  console.log(`\nMeldungen total: ${stats.total}`);
  console.log("Nach Typ:", Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
  const withCoords = items.filter(i => i.lats.length).length;
  const withAddr = items.filter(i => i.addresses.length).length;
  const tmcOnly = items.filter(i => !i.lats.length && i.tmc.length).length;
  console.log(`\nBaustellen und Sperrungen Region Bern: ${stats.kept}`);
  console.log(`  mit Koordinaten: ${withCoords}, mit Adresse: ${withAddr}, nur TMC-Code: ${tmcOnly}`);
  console.log("\n================ Die ersten 60 Treffer ================");
  items.slice(0, 60).forEach((i, n) => {
    console.log(`\n#${n + 1} ${i.type} (${i.match}) ${i.id}`);
    console.log(`  Zeitraum: ${i.start || "?"} bis ${i.end || "offen"}, Status: ${i.status || "?"}`);
    console.log(`  Text: ${(i.description || "–").slice(0, 300)}`);
    if (i.addresses.length) console.log(`  Adressen: ${i.addresses.join(" | ")}`);
    if (i.lats.length) console.log(`  Koordinaten: ${i.lats.map((la, k) => la + "," + i.lons[k]).join(" | ")}`);
    if (i.tmc.length) console.log(`  TMC-Codes: ${i.tmc.join(", ")}`);
  });
  writeFileSync("astra-bern.json", JSON.stringify({ created: new Date().toISOString(), stats, items }, null, 1));
  console.log("\nAlle Treffer sind zusätzlich als Datei astra-bern.json unter «Artifacts» gespeichert.");
}

if (!process.env.NO_MAIN) main().catch(e => { console.error("Fehler:", e.message); process.exit(1); });
