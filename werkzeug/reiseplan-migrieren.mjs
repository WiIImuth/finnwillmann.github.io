#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Migration japan_optional_stays_v2
 *
 *   node werkzeug/reiseplan-migrieren.mjs
 *
 * Zieht content/reiseplan.json auf Schema 2 und traegt die Entwuerfe
 * und den Katalog aus reiseplan-daten.mjs ein. Existiert die Datei
 * noch nicht, wird sie angelegt.
 *
 * Regeln:
 *   - Erkannt wird ueber die stabile externe Kennung, nicht ueber
 *     Namen oder Arraypositionen. Ein zweiter Lauf aendert nichts.
 *   - Eigene Bearbeitungen bleiben stehen. Der Katalog fuellt nur
 *     Felder, die der Nutzer nicht angefasst hat.
 *   - Ausgeblendete Vorschlaege bleiben ausgeblendet.
 *   - Geloescht wird nichts. Was nicht mehr im Katalog steht, bleibt
 *     erhalten und wird als eigener Eintrag gefuehrt.
 * ------------------------------------------------------------------ */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIGRATION, ORTE, ROUTEN, VORSCHLAEGE } from "./reiseplan-daten.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "content", "reiseplan.json");
const ZIEL_NAECHTE = 20;
const ZIEL_TAGE = 21;

const argumente = new Set(process.argv.slice(2));
const trocken = argumente.has("--probe");

/* --------------------------------------------------------- Anlegen - */

function leererPlan() {
  return {
    schema: 2,
    revision: 0,
    migrationen: [],
    erstellt: new Date().toISOString().slice(0, 10),
    startdatum: null,
    zeitzone: "Asia/Tokyo",
    zielTage: ZIEL_TAGE,
    zielNaechte: ZIEL_NAECHTE,
    hochzeitsort: null,
    orte: {},
    routen: [],
    unterkuenfte: {},
  };
}

let plan = existsSync(ZIEL) ? JSON.parse(readFileSync(ZIEL, "utf8")) : leererPlan();
const vorher = JSON.stringify(plan);
const bericht = { orte: 0, routen: 0, entwuerfe: 0, neu: 0, ergaenzt: 0, unberuehrt: 0, unterkuenfte: 0 };

/* -------------------------------------------------- Schema anheben - */

// Fassung 1 zaehlte Tagesbloecke, die sich nicht ueberlappten, und kam
// damit auf 21 Naechte statt 20. Die Ergaenzung ersetzt diese
// Verteilungen ausdruecklich. Die alten Aufenthalte werden deshalb
// nicht in Naechte umgerechnet, sondern durch die neuen Entwuerfe
// abgeloest. Eigene Notizen daraus werden uebernommen.
const alteNotizen = {};
const alteBesuche = {};
if (plan.schema === 1) {
  for (const r of plan.routen || []) {
    for (const a of r.aufenthalte || []) {
      if (a.notizen) alteNotizen[(a.ortId || "hochzeitsort") + "@" + r.id] = a.notizen;
    }
    // Fassung 1 kannte noch keine stabilen Kennungen. Was der Nutzer an
    // diesen Eintraegen bestimmt hat, wird ueber Route, Ort und Name
    // gemerkt und weiter unten auf den Katalogeintrag uebertragen. Die
    // alten Eintraege selbst fallen weg, sonst gaebe es sie doppelt.
    for (const b of r.besuche || []) {
      if (b.extId) continue;
      alteBesuche[r.id + "|" + (b.ortId || "") + "|" + b.name] = {
        status: b.status,
        notizen: b.notizen,
        tag: b.tag,
        reihenfolge: b.reihenfolge,
        ausgeblendet: b.ausgeblendet,
      };
    }
    r.besuche = (r.besuche || []).filter((b) => b.extId);
  }
  plan.schema = 2;
  plan.zielNaechte = ZIEL_NAECHTE;
  plan.unterkuenfte = plan.unterkuenfte || {};
}

plan.schema = 2;
plan.zielTage = ZIEL_TAGE;
plan.zielNaechte = ZIEL_NAECHTE;
plan.orte = plan.orte || {};
plan.routen = plan.routen || [];
plan.unterkuenfte = plan.unterkuenfte || {};
plan.migrationen = plan.migrationen || [];

/* ------------------------------------------------------------ Orte - */

// Ein Ort, den der Nutzer selbst gesetzt hat, bleibt wie er ist. Neue
// Orte kommen dazu, fehlende Felder werden ergaenzt.
for (const [id, neu] of Object.entries(ORTE)) {
  const alt = plan.orte[id];
  if (!alt) {
    plan.orte[id] = { ...neu };
    bericht.orte++;
    continue;
  }
  if (alt.vomNutzer) continue;
  for (const feld of ["name", "typ", "genauigkeit", "quelle", "anker", "nameJa", "code"]) {
    if (neu[feld] !== undefined && alt[feld] === undefined) alt[feld] = neu[feld];
  }
  // Koordinaten nur setzen, wo bisher keine standen.
  if ((alt.lat === null || alt.lat === undefined) && neu.lat !== null) {
    alt.lat = neu.lat;
    alt.lon = neu.lon;
    alt.quelle = neu.quelle;
    alt.genauigkeit = neu.genauigkeit;
  }
}

/* ---------------------------------------------------------- Routen - */

for (const vorlage of ROUTEN) {
  let route = plan.routen.find((r) => r.id === vorlage.id);
  if (!route) {
    route = { id: vorlage.id, besuche: [] };
    plan.routen.push(route);
    bericht.routen++;
  }
  route.name = route.nameVomNutzer ? route.name : vorlage.name;
  route.farbe = route.farbeVomNutzer ? route.farbe : vorlage.farbe;
  route.besuche = route.besuche || [];

  route.ankunft = route.ankunft || {
    id: "e-" + vorlage.id + "-an",
    art: "ankunft",
    ortId: "ort-tokio",
    flughafenOffen: ["flh-haneda", "flh-narita"],
    text: "Ankunft in Tokio an Tag 1. Nur ein Ereignis, keine eigene Übernachtung. Der Flughafen steht noch nicht fest.",
  };
  route.abflug = route.abflug || {
    id: "e-" + vorlage.id + "-ab",
    art: "abflug",
    ortId: "ort-tokio",
    flughafenOffen: ["flh-haneda", "flh-narita"],
    text: "Internationaler Rückflug ab Tokio an Tag 21. Ein Abschlussereignis, kein Ziel auf der Japan Karte.",
  };

  /* Entwuerfe ------------------------------------------------------ */

  route.entwuerfe = route.entwuerfe || [];
  for (const ev of vorlage.entwuerfe) {
    let e = route.entwuerfe.find((x) => x.id === ev.id);
    if (!e) {
      e = { id: ev.id, aufenthalte: [], verbindungen: [] };
      route.entwuerfe.push(e);
      bericht.entwuerfe++;
    }
    if (e.vomNutzer) continue;
    e.name = ev.name;
    e.beschreibung = ev.beschreibung;
    e.quelle = ev.quelle;
    e.vorschlag = ev.vorschlag;

    // Aufenthalte: vorhandene behalten ihre Notizen und Naechte, wenn
    // der Nutzer sie geaendert hat.
    const alteHalte = new Map((e.aufenthalte || []).map((a) => [a.id, a]));
    e.aufenthalte = ev.aufenthalte.map((neu) => {
      // Immer dieselbe Form, damit ein zweiter Lauf nichts umbaut.
      const alt = alteHalte.get(neu.id) || {};
      const uebernommen = alteNotizen[(neu.ortId || "hochzeitsort") + "@" + vorlage.id];
      return {
        ...neu,
        naechte: alt.naechteVomNutzer ? alt.naechte : neu.naechte,
        naechteVomNutzer: alt.naechteVomNutzer || false,
        titel: alt.titel ?? neu.titel,
        // Eine aus Fassung 1 uebernommene Notiz gehoert ab jetzt dem
        // Nutzer, sonst wuerde sie beim naechsten Lauf wieder wegfallen.
        notizen: alt.notizenVomNutzer ? alt.notizen : neu.notizen || uebernommen || "",
        notizenVomNutzer: alt.notizenVomNutzer || (!neu.notizen && !!uebernommen),
      };
    });

    // Verbindungen entstehen aus den Uebergaengen zwischen Ankunft,
    // Aufenthalten und Abflug. Sie tragen keine eigenen Nutzerdaten,
    // solange nichts berechnet wurde.
    const kette = [
      { art: "ereignis", id: route.ankunft.id },
      ...e.aufenthalte.map((a) => ({ art: "aufenthalt", id: a.id })),
    ];
    const alteVerb = new Map((e.verbindungen || []).map((x) => [x.id, x]));
    e.verbindungen = [];
    for (let i = 0; i < kette.length - 1; i++) {
      const id = e.id + "-v" + (i + 1);
      const spec = ev.uebergaenge[i] || [{ mittel: "offen", vonOrt: null, nachOrt: null, hinweis: "Übergang noch nicht festgelegt." }];
      const alt = alteVerb.get(id);
      if (alt && alt.vomNutzer) {
        e.verbindungen.push(alt);
        continue;
      }
      e.verbindungen.push({
        id,
        von: kette[i],
        nach: kette[i + 1],
        abschnitte: spec.map((s, k) => ({
          id: id + "-a" + (k + 1),
          mittel: s.mittel,
          vonOrt: s.vonOrt,
          nachOrt: s.nachOrt,
          offen: s.vonOrt === null || s.nachOrt === null || s.mittel === "offen",
          geometrie: null,
          dauerMin: null,
          distanzKm: null,
          herkunft: null,
          hinweis: s.hinweis || "",
        })),
        genauigkeit: "schematisch",
        geometrie: null,
        dauerMin: null,
        distanzKm: null,
        herkunft: null,
        abgefragt: null,
        hinweis: "",
      });
    }
  }

  if (!route.aktiverEntwurf || !route.entwuerfe.some((e) => e.id === route.aktiverEntwurf)) {
    route.aktiverEntwurf = vorlage.aktiverEntwurf;
  }

  // Fassung 1 hatte Aufenthalte und Verbindungen direkt an der Route.
  delete route.aufenthalte;
  delete route.verbindungen;

  /* Vorschlaege ---------------------------------------------------- */

  const vorhanden = new Map(route.besuche.map((b) => [b.extId, b]));
  let nummer = route.besuche.length;
  for (const kv of VORSCHLAEGE[vorlage.id]) {
    const alt = vorhanden.get(kv.extId);
    if (!alt) {
      const neu = { id: vorlage.id + "-b" + ++nummer, ...JSON.parse(JSON.stringify(kv)) };
      // Bestimmungen aus Fassung 1 uebernehmen, falls es den Eintrag
      // dort schon gab.
      const frueher = alteBesuche[vorlage.id + "|" + (kv.ortId || "") + "|" + kv.name];
      if (frueher) {
        for (const feld of ["status", "tag", "reihenfolge", "ausgeblendet"]) {
          if (frueher[feld] !== undefined && frueher[feld] !== null) neu[feld] = frueher[feld];
        }
        if (frueher.notizen) neu.notizen = frueher.notizen;
      }
      route.besuche.push(neu);
      bericht.neu++;
      continue;
    }
    // Alles, was der Nutzer bestimmt, bleibt: Status, Ausblenden,
    // Notizen, Tageszuordnung, eigene Koordinaten.
    let angefasst = false;
    for (const feld of ["name", "basis", "form", "region", "kategorien", "interesse", "quelleLink"]) {
      if (alt[feld] === undefined) {
        alt[feld] = JSON.parse(JSON.stringify(kv[feld]));
        angefasst = true;
      }
    }
    if (alt.ortId === undefined || (alt.ortId === null && kv.ortId && !alt.ortVomNutzer)) {
      alt.ortId = kv.ortId;
      angefasst = true;
    }
    if (!alt.mobilitaet || (!alt.mobilitaet.hinweis && kv.mobilitaet.hinweis && !alt.mobilitaetVomNutzer)) {
      alt.mobilitaet = JSON.parse(JSON.stringify(kv.mobilitaet));
      angefasst = true;
    }
    for (const feld of ["status", "ausgeblendet", "tag", "reihenfolge", "notizen"]) {
      if (alt[feld] === undefined) {
        alt[feld] = kv[feld];
        angefasst = true;
      }
    }
    if (angefasst) bericht.ergaenzt++;
    else bericht.unberuehrt++;
  }
}

/* ----------------------------------------------------- Unterkünfte - */

// Je Aufenthalt eine Unterkunft, zunaechst ohne Hotel. Kein erfundenes
// Haus, kein erfundener Buchungsstand, kein Preis.
for (const r of plan.routen) {
  for (const e of r.entwuerfe) {
    for (const a of e.aufenthalte) {
      if (plan.unterkuenfte[a.id]) continue;
      plan.unterkuenfte[a.id] = {
        aufenthaltId: a.id,
        stadtOrtId: a.ortId,
        hotel: null,
        zimmerbedarf: "Drei Personen, Aufteilung offen",
        zugang: "unbekannt",
        status: "noch nicht gewählt",
        notizen: "",
      };
      bericht.unterkuenfte++;
    }
  }
}

/* ---------------------------------------------------------- Prüfen - */

const fehler = [];
for (const r of plan.routen) {
  for (const e of r.entwuerfe) {
    const summe = e.aufenthalte.reduce((s, a) => s + a.naechte, 0);
    if (summe !== ZIEL_NAECHTE) fehler.push(`${r.id}/${e.id}: ${summe} Nächte statt ${ZIEL_NAECHTE}`);
    for (const a of e.aufenthalte) {
      if (a.ortId && !plan.orte[a.ortId]) fehler.push(`${r.id}/${e.id}/${a.id}: Ort ${a.ortId} fehlt`);
    }
  }
  const kennungen = r.besuche.map((b) => b.extId);
  const doppelt = kennungen.filter((k, i) => kennungen.indexOf(k) !== i);
  if (doppelt.length) fehler.push(`${r.id}: doppelte Kennungen ${[...new Set(doppelt)].join(", ")}`);
  const zusatz = r.besuche.filter((b) => String(b.extId).startsWith("japan-extra-v1:") && !b.ausgeblendet).length;
  if (zusatz < 10) fehler.push(`${r.id}: nur ${zusatz} zusätzliche Optionen, mindestens 10 erwartet`);
  for (const b of r.besuche) {
    if (b.ortId && !plan.orte[b.ortId]) fehler.push(`${r.id}/${b.extId}: Ort ${b.ortId} fehlt`);
  }
}
for (const o of Object.values(plan.orte)) {
  if (o.lat === null || o.lat === undefined) continue;
  if (o.lat < 24 || o.lat > 46 || o.lon < 122 || o.lon > 146) {
    fehler.push(`${o.id}: ${o.lat}, ${o.lon} liegt nicht in Japan`);
  }
}

if (fehler.length) {
  console.error("✗ Migration abgebrochen, der Plan wäre nicht schlüssig:");
  for (const f of fehler) console.error("   " + f);
  process.exit(1);
}

/* -------------------------------------------------------- Schreiben - */

if (!plan.migrationen.includes(MIGRATION)) plan.migrationen.push(MIGRATION);

const nachher = JSON.stringify(plan);
const geaendert = nachher !== vorher;
if (geaendert) plan.revision = (plan.revision || 0) + 1;

if (trocken) {
  console.log(geaendert ? "Probe: es gäbe Änderungen." : "Probe: nichts zu tun, der Plan ist auf Stand.");
  process.exit(geaendert ? 0 : 0);
}

if (!geaendert) {
  console.log("✓ Nichts zu tun, " + MIGRATION + " ist bereits angewendet.");
  process.exit(0);
}

mkdirSync(path.dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, JSON.stringify(plan, null, 2) + "\n", "utf8");

const orte = Object.values(plan.orte);
console.log("✓ " + MIGRATION + " angewendet, Revision " + plan.revision);
console.log(`  Orte neu ${bericht.orte}, insgesamt ${orte.length}, davon ${orte.filter((o) => o.lat == null).length} ohne Punkt`);
console.log(`  Entwürfe neu ${bericht.entwuerfe}, insgesamt ${plan.routen.reduce((s, r) => s + r.entwuerfe.length, 0)}`);
console.log(`  Vorschläge neu ${bericht.neu}, ergänzt ${bericht.ergaenzt}, unberührt ${bericht.unberuehrt}`);
console.log(`  Unterkünfte angelegt ${bericht.unterkuenfte}, alle ohne gewähltes Haus`);
