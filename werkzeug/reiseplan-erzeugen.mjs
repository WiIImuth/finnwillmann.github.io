/* ------------------------------------------------------------------ *
 * Ausgangsplan fuer den Reiseplaner
 *
 * Schreibt content/reiseplan.json. Das passiert genau einmal. Liegt die
 * Datei schon da, ruehrt dieses Skript sie nicht an, sonst waeren alle
 * spaeteren Aenderungen weg. Mit --ueberschreiben laesst sich das
 * erzwingen.
 *
 * Die Koordinaten stammen aus OpenStreetMap, abgefragt ueber Nominatim
 * am 6. September 2026. Jeder Ort traegt seine Herkunft und wie genau
 * der Punkt ist. Wo kein belastbarer Punkt vorlag, steht null und der
 * Ort bleibt in der Liste mit "Ort auf Karte festlegen".
 * ------------------------------------------------------------------ */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = path.join(ROOT, "content", "reiseplan.json");
const OSM = "OpenStreetMap über Nominatim, abgefragt am 06.09.2026";

/* ---------------------------------------------------------- Orte --- */

// genauigkeit: bestaetigt  = der benannte Punkt selbst
//              ortsanker   = Bahnhof oder Zentrum, stellvertretend fuer den Ort
//              gebiet      = ein Viertel oder eine Strasse, kein einzelner Punkt
//              offen       = noch kein Punkt, muss auf der Karte gesetzt werden
const O = {};
const ort = (id, name, lat, lon, typ, genauigkeit, extra = {}) => {
  O[id] = { id, name, lat, lon, typ, genauigkeit, quelle: lat === null ? null : OSM, ...extra };
  return id;
};

// Staedte und Aufenthaltsanker
ort("ort-tokio", "Tokio", 35.6818, 139.764981, "stadt", "ortsanker", { anker: "Bahnhof Tokio, Marunouchi", nameJa: "東京" });
ort("ort-fukuoka", "Fukuoka", 33.59004, 130.4199, "stadt", "ortsanker", { anker: "Bahnhof Hakata", nameJa: "福岡" });
ort("ort-kumamoto", "Kumamoto", 32.78968, 130.6897, "stadt", "ortsanker", { anker: "Bahnhof Kumamoto", nameJa: "熊本" });
ort("ort-nagasaki", "Nagasaki", 32.75239, 129.86892, "stadt", "ortsanker", { anker: "Bahnhof Nagasaki", nameJa: "長崎" });
ort("ort-kagoshima", "Kagoshima", 31.58371, 130.54179, "stadt", "ortsanker", { anker: "Bahnhof Kagoshima-Chuo", nameJa: "鹿児島" });
ort("ort-onna", "Onna", 26.49748, 127.85343, "stadt", "ortsanker", { anker: "Gemeindegebiet Onna, Mittelpunkt", nameJa: "恩納村" });
ort("ort-hiroshima", "Hiroshima", 34.39783, 132.47558, "stadt", "ortsanker", { anker: "Bahnhof Hiroshima", nameJa: "広島" });
ort("ort-okayama", "Okayama", 34.66675, 133.91827, "stadt", "ortsanker", { anker: "Bahnhof Okayama", nameJa: "岡山" });

// Flughaefen
ort("flh-haneda", "Flughafen Tokio Haneda", 35.54569, 139.7761, "flughafen", "bestaetigt", { code: "HND" });
ort("flh-narita", "Flughafen Tokio Narita", 35.77587, 140.39331, "flughafen", "bestaetigt", { code: "NRT" });
ort("flh-fukuoka", "Flughafen Fukuoka", 33.5868, 130.44739, "flughafen", "bestaetigt", { code: "FUK" });
ort("flh-kumamoto", "Flughafen Kumamoto", 32.83623, 130.85544, "flughafen", "bestaetigt", { code: "KMJ" });
ort("flh-kagoshima", "Flughafen Kagoshima", 31.80325, 130.71719, "flughafen", "bestaetigt", { code: "KOJ" });
ort("flh-naha", "Flughafen Naha", 26.1967, 127.64895, "flughafen", "bestaetigt", { code: "OKA" });

// Bahnhoefe und Anleger, die nur fuer Ausfluege gebraucht werden
ort("bhf-miyajimaguchi", "Bahnhof Miyajimaguchi", 34.31231, 132.30294, "bahnhof", "bestaetigt");
ort("hafen-miyajima", "Fähranleger Miyajima", 34.30209, 132.32225, "hafen", "bestaetigt");
ort("hafen-kagoshima", "Fähranleger Kagoshima", 31.59653, 130.5628, "hafen", "bestaetigt");
ort("hafen-sakurajima", "Fähranleger Sakurajima", null, null, "hafen", "offen");

// Sehenswuerdigkeiten
ort("s-dejima", "Dejima", 32.74366, 129.87255, "sicht", "bestaetigt", { nameJa: "出島" });
ort("s-glover", "Glover Garden", 32.73337, 129.86906, "sicht", "bestaetigt", { nameJa: "グラバー園" });
ort("s-dejima-wharf", "Dejima Wharf", 32.74357, 129.8706, "sicht", "bestaetigt");
ort("s-sakurajima", "Sakurajima", 31.58057, 130.65798, "sicht", "bestaetigt", { anker: "Gipfel", nameJa: "桜島" });
ort("s-yunohira", "Yunohira Aussichtspunkt", 31.59149, 130.62998, "sicht", "bestaetigt", { nameJa: "湯之平展望所" });
ort("s-senganen", "Senganen", 31.61866, 130.58055, "sicht", "bestaetigt", { nameJa: "仙巌園" });
ort("s-omotesando", "Omotesando", 35.66770, 139.70721, "sicht", "gebiet", { anker: "Straßenzug Omotesando", nameJa: "表参道" });
ort("s-aoyama", "Minami-Aoyama", 35.66672, 139.71886, "sicht", "gebiet", { anker: "Stadtteilgrenze", nameJa: "南青山" });
ort("s-kiyosumi", "Kiyosumi-Shirakawa", 35.68205, 139.79876, "sicht", "gebiet", { anker: "Bahnhof Kiyosumi-Shirakawa", nameJa: "清澄白河" });
ort("s-mot", "Museum of Contemporary Art Tokyo", 35.67978, 139.80879, "sicht", "bestaetigt", { nameJa: "東京都現代美術館" });
ort("s-friedensmuseum", "Friedensmuseum Hiroshima", 34.39155, 132.4531, "sicht", "bestaetigt", { nameJa: "広島平和記念資料館" });
ort("s-itsukushima", "Itsukushima Schrein", 34.29653, 132.319, "sicht", "bestaetigt", { nameJa: "厳島神社" });
ort("s-kurashiki", "Kurashiki Bikan Viertel", 34.59652, 133.77259, "sicht", "bestaetigt", { nameJa: "倉敷美観地区" });
ort("s-washuzan", "Washuzan Aussichtspunkt", 34.43549, 133.81247, "sicht", "bestaetigt", { nameJa: "鷲羽山展望台" });
ort("s-churaumi", "Churaumi Aquarium", 26.69437, 127.87804, "sicht", "bestaetigt", { nameJa: "沖縄美ら海水族館" });
ort("s-yachimun", "Yomitan Yachimun no Sato", 26.4054, 127.75498, "sicht", "bestaetigt", { nameJa: "やちむんの里" });
ort("s-manzamo", "Kap Manzamo an der Westküste", 26.50501, 127.85026, "sicht", "bestaetigt", { nameJa: "万座毛" });

/* ------------------------------------------------------ Quellen --- */

const Q = {
  dejima: "https://www.discover-nagasaki.com/en/sightseeing/63",
  glover: "https://www.discover-nagasaki.com/en/sightseeing/101",
  yunohira: "https://www.kagoshima-kankou.com/for/attractions/10573",
  sakurajima: "https://www.kagoshima-kankou.com/for/areaguide/sakurajima",
  senganen: "https://www.accessible-japan.com/places/japan/kagoshima/kagoshima-1/attractions/sengan-en/",
  onna: "https://visitokinawajapan.com/destinations/okinawa-main-island/northern-okinawa-main-island/onna-coast/",
  yomitan: "https://visitokinawajapan.com/destinations/okinawa-main-island/central-okinawa-main-island/yomitan/",
  churaumi: "https://churaumi.okinawa/sp/en/guide/accessibility/",
  miyajima: "https://dive-hiroshima.com/en/feature/world_heritage-about_miyajima/",
  kurashiki: "https://www.japan.travel/en/destinations/chugoku/okayama/kurashiki/",
  washuzan: "https://www.okayama-japan.jp/en/spot/10761",
  architektur: "https://www.gotokyo.org/en/see-and-do/arts-and-design/architecture/index.html",
  kiyosumi: "https://www.gotokyo.org/en/destinations/eastern-tokyo/kiyosumi-shirakawa/index.html",
};

// Alles unbekannt, solange nichts Belastbares vorliegt. Fehlende
// Angabe ist kein Beleg fuer einen leichten Weg.
const mobiUnbekannt = () => ({
  treppen: "unbekannt",
  steigung: "unbekannt",
  untergrund: "unbekannt",
  sitzen: "unbekannt",
  vomAusstieg: "unbekannt",
  taxi: "unbekannt",
  gehstrecke: "unbekannt",
  hinweis: "",
  quelle: "",
});

const mobi = (teil) => ({ ...mobiUnbekannt(), ...teil });

/* --------------------------------------------------- Bausteine --- */

let zaehler = 0;
const neueId = (p) => `${p}-${(++zaehler).toString(36)}`;

const aufenthalt = (id, ortId, tage, notizen = "", offen = null) => ({
  id,
  ortId,
  ortOffen: offen,
  tage,
  titel: null,
  notizen,
});

const besuch = (id, aufenthaltId, ortId, name, kategorien, extra = {}) => ({
  id,
  aufenthaltId,
  ortId,
  name,
  status: "vorgeschlagen",
  kategorien,
  tag: null,
  reihenfolge: null,
  quelleLink: extra.quelle || "",
  mobilitaet: extra.mobilitaet || mobiUnbekannt(),
  notizen: extra.notizen || "",
});

// Eine Verbindung kennt ihre Endpunkte und ihre Abschnitte. Genauigkeit
// sagt ehrlich, woher die Linie kommt:
//   offen        = ein Endpunkt oder das Verkehrsmittel steht noch nicht fest
//   schematisch  = geplante Verbindung zwischen Orten, keine echte Strecke
//   berechnet    = tatsaechlich gelieferte Routendaten
const verbindung = (id, von, nach, abschnitte, hinweis = "") => ({
  id,
  von,
  nach,
  abschnitte,
  genauigkeit: abschnitte.some((a) => a.offen) ? "offen" : "schematisch",
  geometrie: null,
  dauerMin: null,
  distanzKm: null,
  herkunft: null,
  abgefragt: null,
  hinweis,
});

const abschnitt = (mittel, vonOrt, nachOrt, extra = {}) => ({
  id: neueId("ab"),
  mittel,
  vonOrt,
  nachOrt,
  offen: vonOrt === null || nachOrt === null || mittel === "offen" || !!extra.offen,
  geometrie: null,
  dauerMin: null,
  distanzKm: null,
  herkunft: null,
  hinweis: extra.hinweis || "",
});

const ref = (art, id) => ({ art, id });

/* -------------------------------------------------- Die Routen --- */

const hochzeitNotiz =
  "Ankunft in Tokio, Weiterreise zum Hochzeitsort, Hochzeit, Erholung. " +
  "Der Ort steht noch nicht fest, Fukuoka und Kumamoto sind zwei Alternativen.";

const tokioAnkunft = (id) => ({
  id,
  art: "ankunft",
  ortId: "ort-tokio",
  flughafenOffen: ["flh-haneda", "flh-narita"],
  text: "Ankunft in Tokio. Nur ein Ereignis an Tag 1, keine Übernachtung. Der Flughafen steht noch nicht fest.",
});

const tokioAbflug = (id) => ({
  id,
  art: "abflug",
  ortId: "ort-tokio",
  flughafenOffen: ["flh-haneda", "flh-narita"],
  text: "Internationaler Rückflug ab Tokio an Tag 21. Ein Abschlussereignis, kein Ziel auf der Japan Karte.",
});

/* Route 1 ---------------------------------------------------------- */

const r1 = {
  id: "r1",
  name: "Kyushu und Tokio",
  farbe: "#2563EB",
  ankunft: tokioAnkunft("e-r1-an"),
  abflug: tokioAbflug("e-r1-ab"),
  aufenthalte: [
    aufenthalt("a-r1-1", null, 4, hochzeitNotiz, { grund: "hochzeitsort", kandidaten: ["ort-fukuoka", "ort-kumamoto"] }),
    aufenthalt("a-r1-2", "ort-nagasaki", 4),
    aufenthalt("a-r1-3", "ort-kagoshima", 6, "Freie Zeit für Küste und heiße Quellen."),
    aufenthalt("a-r1-4", "ort-tokio", 7, "Eigene Lieblingsorte."),
  ],
  besuche: [
    besuch("b-r1-1", "a-r1-2", "s-dejima", "Dejima", ["kultur", "museum"], { quelle: Q.dejima }),
    besuch("b-r1-2", "a-r1-2", "s-glover", "Glover Garden", ["kultur", "landschaft"], {
      quelle: Q.glover,
      mobilitaet: mobi({
        steigung: "am Hang gelegen",
        hinweis: "Der Glover Garden liegt am Hang. Vor dem Besuch selbst prüfen, welche Wege und Aufstiegshilfen es gibt.",
        quelle: Q.glover,
      }),
    }),
    besuch("b-r1-3", "a-r1-2", "s-dejima-wharf", "Dejima Wharf", ["essen"], {}),
    besuch("b-r1-4", "a-r1-2", null, "Regionale Küche", ["essen"], {
      notizen: "Noch kein Lokal ausgesucht. Ort auf der Karte festlegen, sobald es eins gibt.",
    }),
    besuch("b-r1-5", "a-r1-3", "s-sakurajima", "Sakurajima", ["landschaft"], {
      quelle: Q.sakurajima,
      notizen: "Tagesausflug mit der Fähre, keine zusätzliche Übernachtung.",
    }),
    besuch("b-r1-6", "a-r1-3", "s-yunohira", "Yunohira Aussichtspunkt", ["landschaft"], {
      quelle: Q.yunohira,
      mobilitaet: mobi({
        taxi: "mit Fahrzeug anfahrbar",
        hinweis:
          "Yunohira lässt sich mit einem Fahrzeug anfahren. Das sagt allein noch nichts über die Wege vor Ort.",
        quelle: Q.yunohira,
      }),
    }),
    besuch("b-r1-7", "a-r1-3", "s-senganen", "Senganen", ["kultur", "landschaft"], {
      quelle: Q.senganen,
      mobilitaet: mobi({
        hinweis: "Senganen ist nur teilweise zugänglich. Für den konkreten Besuch selbst nachfragen.",
        quelle: Q.senganen,
      }),
    }),
    besuch("b-r1-8", "a-r1-3", null, "Küste und heiße Quellen", ["landschaft", "onsen"], {
      notizen: "Noch offen. Ort auf der Karte festlegen.",
    }),
    besuch("b-r1-9", "a-r1-4", "s-omotesando", "Omotesando", ["architektur"], { quelle: Q.architektur }),
    besuch("b-r1-10", "a-r1-4", "s-aoyama", "Minami-Aoyama", ["architektur"], { quelle: Q.architektur }),
    besuch("b-r1-11", "a-r1-4", "s-kiyosumi", "Kiyosumi-Shirakawa", ["kultur"], { quelle: Q.kiyosumi }),
    besuch("b-r1-12", "a-r1-4", "s-mot", "Museum of Contemporary Art Tokyo", ["museum"], { quelle: Q.kiyosumi }),
    besuch("b-r1-13", "a-r1-4", null, "Eigene Lieblingsorte", ["kultur"], {
      notizen: "Noch offen. Ort auf der Karte festlegen.",
    }),
  ],
  verbindungen: [
    verbindung(
      "v-r1-1",
      ref("ereignis", "e-r1-an"),
      ref("aufenthalt", "a-r1-1"),
      [abschnitt("flug", null, null, { hinweis: "Inlandsflug, Vorschlag. Beide Flughäfen stehen noch nicht fest." })],
      "Solange der Hochzeitsort offen ist, verbindet der Bogen nur zwei Regionen."
    ),
    verbindung("v-r1-2", ref("aufenthalt", "a-r1-1"), ref("aufenthalt", "a-r1-2"), [
      abschnitt("bahn", null, "ort-nagasaki", { hinweis: "Bahn, Vorschlag. Startort hängt am Hochzeitsort." }),
    ]),
    verbindung("v-r1-3", ref("aufenthalt", "a-r1-2"), ref("aufenthalt", "a-r1-3"), [
      abschnitt("bahn", "ort-nagasaki", "ort-kagoshima", { hinweis: "Bahn, Vorschlag. Umstiege gehören zur Verbindung." }),
    ]),
    verbindung("v-r1-4", ref("aufenthalt", "a-r1-3"), ref("aufenthalt", "a-r1-4"), [
      abschnitt("auto", "ort-kagoshima", "flh-kagoshima", { hinweis: "Bodentransfer zum Flughafen." }),
      abschnitt("flug", "flh-kagoshima", null, { hinweis: "Flug nach Tokio. Haneda oder Narita ist noch offen." }),
    ]),
  ],
};

/* Route 2 ---------------------------------------------------------- */

const r2 = {
  id: "r2",
  name: "Kyushu, Okinawa und Tokio",
  farbe: "#0F766E",
  ankunft: tokioAnkunft("e-r2-an"),
  abflug: tokioAbflug("e-r2-ab"),
  aufenthalte: [
    aufenthalt("a-r2-1", null, 4, hochzeitNotiz, { grund: "hochzeitsort", kandidaten: ["ort-fukuoka", "ort-kumamoto"] }),
    aufenthalt("a-r2-2", "ort-kagoshima", 4, "Erholung."),
    aufenthalt("a-r2-3", "ort-onna", 6, "Westküste, Meerblick, freie Tage."),
    aufenthalt("a-r2-4", "ort-tokio", 7, "Architektur, einzelne Viertel, Museen, Lieblingsorte."),
  ],
  besuche: [
    besuch("b-r2-1", "a-r2-2", "s-sakurajima", "Sakurajima", ["landschaft"], { quelle: Q.sakurajima }),
    besuch("b-r2-2", "a-r2-2", "s-yunohira", "Yunohira Aussichtspunkt", ["landschaft"], {
      quelle: Q.yunohira,
      mobilitaet: mobi({
        taxi: "mit Fahrzeug anfahrbar",
        hinweis: "Yunohira lässt sich mit einem Fahrzeug anfahren. Das sagt allein noch nichts über die Wege vor Ort.",
        quelle: Q.yunohira,
      }),
    }),
    besuch("b-r2-3", "a-r2-2", "s-senganen", "Senganen", ["kultur", "landschaft"], {
      quelle: Q.senganen,
      mobilitaet: mobi({
        hinweis: "Senganen ist nur teilweise zugänglich. Für den konkreten Besuch selbst nachfragen.",
        quelle: Q.senganen,
      }),
    }),
    besuch("b-r2-4", "a-r2-3", "s-manzamo", "Westküste bei Onna", ["landschaft"], { quelle: Q.onna }),
    besuch("b-r2-5", "a-r2-3", "s-yachimun", "Yomitan Yachimun no Sato", ["kultur"], { quelle: Q.yomitan }),
    besuch("b-r2-6", "a-r2-3", "s-churaumi", "Churaumi Aquarium", ["museum"], {
      quelle: Q.churaumi,
      notizen: "Optional.",
      mobilitaet: mobi({
        hinweis:
          "Das Churaumi Aquarium nennt Aufzüge und Leihrollstühle. Die Verfügbarkeit ist damit nicht garantiert, vor Ort prüfen.",
        quelle: Q.churaumi,
      }),
    }),
    besuch("b-r2-7", "a-r2-3", null, "Freie Tage", ["landschaft"], { notizen: "Noch offen." }),
    besuch("b-r2-8", "a-r2-4", null, "Architektur in Tokio", ["architektur"], {
      quelle: Q.architektur,
      notizen: "Noch kein einzelnes Gebäude ausgesucht. Ort auf der Karte festlegen.",
    }),
    besuch("b-r2-9", "a-r2-4", null, "Einzelne Viertel", ["kultur"], { notizen: "Noch offen." }),
    besuch("b-r2-10", "a-r2-4", "s-mot", "Museum of Contemporary Art Tokyo", ["museum"], { quelle: Q.kiyosumi }),
    besuch("b-r2-11", "a-r2-4", null, "Eigene Lieblingsorte", ["kultur"], { notizen: "Noch offen." }),
  ],
  verbindungen: [
    verbindung(
      "v-r2-1",
      ref("ereignis", "e-r2-an"),
      ref("aufenthalt", "a-r2-1"),
      [abschnitt("flug", null, null, { hinweis: "Inlandsflug, Vorschlag. Beide Flughäfen stehen noch nicht fest." })],
      "Solange der Hochzeitsort offen ist, verbindet der Bogen nur zwei Regionen."
    ),
    verbindung("v-r2-2", ref("aufenthalt", "a-r2-1"), ref("aufenthalt", "a-r2-2"), [
      abschnitt("bahn", null, "ort-kagoshima", { hinweis: "Bahn, Vorschlag. Startort hängt am Hochzeitsort." }),
    ]),
    verbindung("v-r2-3", ref("aufenthalt", "a-r2-2"), ref("aufenthalt", "a-r2-3"), [
      abschnitt("auto", "ort-kagoshima", "flh-kagoshima", { hinweis: "Bodentransfer zum Flughafen." }),
      abschnitt("flug", "flh-kagoshima", "flh-naha"),
      abschnitt("auto", "flh-naha", "ort-onna", { hinweis: "Bodentransfer. Onna hat keinen Flughafen." }),
    ]),
    verbindung("v-r2-4", ref("aufenthalt", "a-r2-3"), ref("aufenthalt", "a-r2-4"), [
      abschnitt("auto", "ort-onna", "flh-naha", { hinweis: "Bodentransfer zum Flughafen Naha." }),
      abschnitt("flug", "flh-naha", null, { hinweis: "Flug nach Tokio. Haneda oder Narita ist noch offen." }),
    ]),
  ],
};

/* Route 3 ---------------------------------------------------------- */

const r3 = {
  id: "r3",
  name: "Hiroshima, Okayama und Tokio",
  farbe: "#C2410C",
  ankunft: tokioAnkunft("e-r3-an"),
  abflug: tokioAbflug("e-r3-ab"),
  aufenthalte: [
    aufenthalt("a-r3-1", null, 4, hochzeitNotiz, { grund: "hochzeitsort", kandidaten: ["ort-fukuoka", "ort-kumamoto"] }),
    aufenthalt("a-r3-2", "ort-hiroshima", 4, "Stadtgeschichte."),
    aufenthalt("a-r3-3", "ort-okayama", 5, "Kanal, Museen und Cafés."),
    aufenthalt("a-r3-4", "ort-tokio", 8, "Architektur, ruhige Viertel und eigene Lieblingsorte."),
  ],
  besuche: [
    besuch("b-r3-1", "a-r3-2", "s-friedensmuseum", "Friedensmuseum", ["museum", "kultur"], {}),
    besuch("b-r3-2", "a-r3-2", "s-itsukushima", "Itsukushima Schrein auf Miyajima", ["kultur", "landschaft"], {
      quelle: Q.miyajima,
      notizen: "Optionaler Tagesausflug. Die Fähre ist ein Transportabschnitt, keine zusätzliche Übernachtung.",
      mobilitaet: mobi({
        gehstrecke: "unbekannt",
        hinweis:
          "Miyajima benötigt Wege zwischen Anleger und Besichtigungszielen. Die Länge ist nicht belegt, vor Ort prüfen.",
        quelle: Q.miyajima,
      }),
    }),
    besuch("b-r3-3", "a-r3-3", "s-kurashiki", "Kurashiki Bikan Viertel", ["kultur"], { quelle: Q.kurashiki }),
    besuch("b-r3-4", "a-r3-3", null, "Museen und Cafés in Kurashiki", ["museum", "essen"], {
      quelle: Q.kurashiki,
      notizen: "Noch offen. Ort auf der Karte festlegen.",
    }),
    besuch("b-r3-5", "a-r3-3", "s-washuzan", "Washuzan Aussichtspunkt", ["landschaft"], {
      quelle: Q.washuzan,
      notizen: "Optional, Blick auf die Seto Inlandsee.",
    }),
    besuch("b-r3-6", "a-r3-4", null, "Architektur in Tokio", ["architektur"], {
      quelle: Q.architektur,
      notizen: "Noch kein einzelnes Gebäude ausgesucht.",
    }),
    besuch("b-r3-7", "a-r3-4", "s-kiyosumi", "Ruhige Viertel, etwa Kiyosumi-Shirakawa", ["kultur"], { quelle: Q.kiyosumi }),
    besuch("b-r3-8", "a-r3-4", null, "Eigene Lieblingsorte", ["kultur"], { notizen: "Noch offen." }),
  ],
  verbindungen: [
    verbindung(
      "v-r3-1",
      ref("ereignis", "e-r3-an"),
      ref("aufenthalt", "a-r3-1"),
      [abschnitt("flug", null, null, { hinweis: "Inlandsflug, Vorschlag. Beide Flughäfen stehen noch nicht fest." })],
      "Solange der Hochzeitsort offen ist, verbindet der Bogen nur zwei Regionen."
    ),
    verbindung("v-r3-2", ref("aufenthalt", "a-r3-1"), ref("aufenthalt", "a-r3-2"), [
      abschnitt("bahn", null, "ort-hiroshima", { hinweis: "Bahn, Vorschlag. Startort hängt am Hochzeitsort." }),
    ]),
    verbindung("v-r3-3", ref("aufenthalt", "a-r3-2"), ref("aufenthalt", "a-r3-3"), [
      abschnitt("bahn", "ort-hiroshima", "ort-okayama"),
    ]),
    verbindung("v-r3-4", ref("aufenthalt", "a-r3-3"), ref("aufenthalt", "a-r3-4"), [
      abschnitt("bahn", "ort-okayama", "ort-tokio"),
    ]),
  ],
};

/* ------------------------------------------------------- Prüfen --- */

const plan = {
  schema: 1,
  revision: 1,
  erstellt: "2026-09-06",
  startdatum: null,
  zeitzone: "Asia/Tokyo",
  zielTage: 21,
  hochzeitsort: null,
  orte: O,
  routen: [r1, r2, r3],
};

const fehler = [];

for (const r of plan.routen) {
  const summe = r.aufenthalte.reduce((s, a) => s + a.tage, 0);
  if (summe !== plan.zielTage) fehler.push(`${r.id}: ${summe} Tage statt ${plan.zielTage}`);
  for (const a of r.aufenthalte) {
    if (a.ortId && !O[a.ortId]) fehler.push(`${r.id}/${a.id}: Ort ${a.ortId} fehlt`);
    for (const k of a.ortOffen?.kandidaten || []) if (!O[k]) fehler.push(`${r.id}/${a.id}: Kandidat ${k} fehlt`);
  }
  for (const b of r.besuche) {
    if (!r.aufenthalte.some((a) => a.id === b.aufenthaltId)) fehler.push(`${r.id}/${b.id}: Aufenthalt fehlt`);
    if (b.ortId && !O[b.ortId]) fehler.push(`${r.id}/${b.id}: Ort ${b.ortId} fehlt`);
  }
  const bekannt = new Set([r.ankunft.id, r.abflug.id, ...r.aufenthalte.map((a) => a.id)]);
  for (const v of r.verbindungen) {
    if (!bekannt.has(v.von.id)) fehler.push(`${r.id}/${v.id}: Startpunkt ${v.von.id} fehlt`);
    if (!bekannt.has(v.nach.id)) fehler.push(`${r.id}/${v.id}: Zielpunkt ${v.nach.id} fehlt`);
    for (const s of v.abschnitte) {
      for (const o of [s.vonOrt, s.nachOrt]) if (o && !O[o]) fehler.push(`${r.id}/${v.id}: Ort ${o} fehlt`);
    }
  }
}

for (const o of Object.values(O)) {
  if (o.lat === null) continue;
  if (o.lat < 24 || o.lat > 46) fehler.push(`${o.id}: Breite ${o.lat} liegt nicht in Japan`);
  if (o.lon < 122 || o.lon > 146) fehler.push(`${o.id}: Länge ${o.lon} liegt nicht in Japan`);
}

if (fehler.length) {
  console.error("✗ Ausgangsplan ist nicht schlüssig:");
  for (const f of fehler) console.error("   " + f);
  process.exit(1);
}

/* ------------------------------------------------------ Schreiben - */

if (existsSync(ZIEL) && !process.argv.includes("--ueberschreiben")) {
  console.log("content/reiseplan.json liegt bereits vor, nichts geändert.");
  console.log("Zum Zurücksetzen auf den Ausgangsplan: node werkzeug/reiseplan-erzeugen.mjs --ueberschreiben");
  process.exit(0);
}

mkdirSync(path.dirname(ZIEL), { recursive: true });
writeFileSync(ZIEL, JSON.stringify(plan, null, 2) + "\n", "utf8");

const orte = Object.values(O);
console.log("✓ content/reiseplan.json geschrieben");
console.log(`  ${plan.routen.length} Routen, je ${plan.zielTage} Tage`);
console.log(`  ${orte.length} Orte, davon ${orte.filter((o) => o.lat === null).length} noch ohne Punkt`);
console.log(`  ${plan.routen.reduce((s, r) => s + r.besuche.length, 0)} Vorschläge`);
