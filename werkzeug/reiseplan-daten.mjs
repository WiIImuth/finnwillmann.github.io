/* ------------------------------------------------------------------ *
 * Stammdaten des Reiseplans, Fassung 2
 *
 * Eine Quelle für Orte, Entwürfe und Vorschläge. Die Migration in
 * reiseplan-migrieren.mjs traegt sie in einen vorhandenen Plan ein,
 * ohne eigene Bearbeitungen zu ueberschreiben.
 *
 * Neu gegenueber Fassung 1:
 *   - Gezaehlt werden Naechte, nicht Tagesbloecke. 21 Reisetage sind
 *     20 Naechte. Ein Transfertag gehoert zu beiden angrenzenden
 *     Aufenthalten und zaehlt trotzdem nur einmal.
 *   - Jede Route hat mehrere Entwuerfe, genau einer ist aktiv.
 *   - Vorschlaege haengen an Basisorten, nicht an festen Tagesnummern.
 *     Faellt die Basis im aktiven Entwurf weg, wird der Vorschlag als
 *     verwaist markiert und nicht geloescht.
 *
 * Koordinaten aus OpenStreetMap ueber Nominatim, abgefragt am
 * 06.09.2026. Recherchestand des Katalogs laut Auftrag: 06.09.2026.
 * ------------------------------------------------------------------ */

export const MIGRATION = "japan_optional_stays_v2";
const OSM = "OpenStreetMap über Nominatim, abgefragt am 06.09.2026";

/* ----------------------------------------------------------- Orte -- */

const O = {};
const ort = (id, name, lat, lon, typ, genauigkeit, extra = {}) => {
  O[id] = { id, name, lat, lon, typ, genauigkeit, quelle: lat === null ? null : OSM, ...extra };
  return id;
};

// Staedte und Uebernachtungsbasen
ort("ort-tokio", "Tokio", 35.6818, 139.764981, "stadt", "ortsanker", { anker: "Bahnhof Tokio, Marunouchi", nameJa: "東京" });
ort("ort-fukuoka", "Fukuoka", 33.59004, 130.4199, "stadt", "ortsanker", { anker: "Bahnhof Hakata", nameJa: "福岡" });
ort("ort-kumamoto", "Kumamoto", 32.78968, 130.6897, "stadt", "ortsanker", { anker: "Bahnhof Kumamoto", nameJa: "熊本" });
ort("ort-takeo", "Takeo Onsen", 33.1964, 130.02296, "stadt", "ortsanker", { anker: "Bahnhof Takeo Onsen", nameJa: "武雄温泉" });
ort("ort-nagasaki", "Nagasaki", 32.75239, 129.86892, "stadt", "ortsanker", { anker: "Bahnhof Nagasaki", nameJa: "長崎" });
ort("ort-kagoshima", "Kagoshima", 31.58371, 130.54179, "stadt", "ortsanker", { anker: "Bahnhof Kagoshima-Chuo", nameJa: "鹿児島" });
ort("ort-onna", "Onna", 26.49748, 127.85343, "stadt", "ortsanker", { anker: "Gemeindegebiet Onna, Mittelpunkt", nameJa: "恩納村" });
ort("ort-motobu", "Motobu", 26.65754, 127.89779, "stadt", "ortsanker", { anker: "Rathaus Motobu", nameJa: "本部町" });
ort("ort-naha", "Naha", 26.21448, 127.67961, "stadt", "ortsanker", { anker: "Bereich Kencho-mae, Stadtmitte", nameJa: "那覇" });
ort("ort-hiroshima", "Hiroshima", 34.39783, 132.47558, "stadt", "ortsanker", { anker: "Bahnhof Hiroshima", nameJa: "広島" });
ort("ort-okayama", "Okayama", 34.66675, 133.91827, "stadt", "ortsanker", { anker: "Bahnhof Okayama", nameJa: "岡山" });
ort("ort-kurashiki", "Kurashiki", 34.60114, 133.766, "stadt", "ortsanker", { anker: "Bahnhof Kurashiki", nameJa: "倉敷" });
ort("ort-himeji", "Himeji", 34.82742, 134.68941, "stadt", "ortsanker", { anker: "Bahnhof Himeji", nameJa: "姫路" });

// Flughaefen
ort("flh-haneda", "Flughafen Tokio Haneda", 35.54569, 139.7761, "flughafen", "bestaetigt", { code: "HND" });
ort("flh-narita", "Flughafen Tokio Narita", 35.77587, 140.39331, "flughafen", "bestaetigt", { code: "NRT" });
ort("flh-fukuoka", "Flughafen Fukuoka", 33.5868, 130.44739, "flughafen", "bestaetigt", { code: "FUK" });
ort("flh-kumamoto", "Flughafen Kumamoto", 32.83623, 130.85544, "flughafen", "bestaetigt", { code: "KMJ" });
ort("flh-kagoshima", "Flughafen Kagoshima", 31.80325, 130.71719, "flughafen", "bestaetigt", { code: "KOJ" });
ort("flh-naha", "Flughafen Naha", 26.1967, 127.64895, "flughafen", "bestaetigt", { code: "OKA" });

// Bahnhoefe und Anleger fuer Ausfluege
ort("bhf-miyajimaguchi", "Bahnhof Miyajimaguchi", 34.31231, 132.30294, "bahnhof", "bestaetigt");
ort("hafen-miyajima", "Fähranleger Miyajima", 34.30209, 132.32225, "hafen", "bestaetigt");
ort("hafen-kagoshima", "Fähranleger Kagoshima", 31.59653, 130.5628, "hafen", "bestaetigt");
ort("hafen-sakurajima", "Fähranleger Sakurajima", null, null, "hafen", "offen");

// Ziele aus Fassung 1
ort("s-dejima", "Dejima", 32.74366, 129.87255, "sicht", "bestaetigt", { nameJa: "出島" });
ort("s-glover", "Glover Garden", 32.73337, 129.86906, "sicht", "bestaetigt", { nameJa: "グラバー園" });
ort("s-dejima-wharf", "Dejima Wharf", 32.74357, 129.8706, "sicht", "bestaetigt");
ort("s-sakurajima", "Sakurajima", 31.58057, 130.65798, "sicht", "bestaetigt", { anker: "Gipfel", nameJa: "桜島" });
ort("s-yunohira", "Yunohira Aussichtspunkt", 31.59149, 130.62998, "sicht", "bestaetigt", { nameJa: "湯之平展望所" });
ort("s-senganen", "Senganen", 31.61866, 130.58055, "sicht", "bestaetigt", { nameJa: "仙巌園" });
ort("s-omotesando", "Omotesando", 35.6677, 139.70721, "sicht", "gebiet", { anker: "Straßenzug Omotesando", nameJa: "表参道" });
ort("s-aoyama", "Minami-Aoyama", 35.66672, 139.71886, "sicht", "gebiet", { anker: "Stadtteilgrenze", nameJa: "南青山" });
ort("s-kiyosumi", "Kiyosumi-Shirakawa", 35.68205, 139.79876, "sicht", "gebiet", { anker: "Bahnhof Kiyosumi-Shirakawa", nameJa: "清澄白河" });
ort("s-mot", "Museum of Contemporary Art Tokyo", 35.67978, 139.80879, "sicht", "bestaetigt", { nameJa: "東京都現代美術館" });
ort("s-friedensmuseum", "Friedensmuseum Hiroshima", 34.39155, 132.4531, "sicht", "bestaetigt", { nameJa: "広島平和記念資料館" });
ort("s-itsukushima", "Itsukushima Schrein", 34.29653, 132.319, "sicht", "bestaetigt", { nameJa: "厳島神社" });
ort("s-kurashiki", "Kurashiki Bikan Viertel", 34.59652, 133.77259, "sicht", "bestaetigt", { nameJa: "倉敷美観地区" });
ort("s-washuzan", "Washuzan Aussichtspunkt", 34.43549, 133.81247, "sicht", "bestaetigt", { nameJa: "鷲羽山展望台" });
ort("s-churaumi", "Churaumi Aquarium", 26.69437, 127.87804, "sicht", "bestaetigt", { nameJa: "沖縄美ら海水族館" });
ort("s-yachimun", "Yomitan Yachimun no Sato", 26.4054, 127.75498, "sicht", "bestaetigt", { nameJa: "やちむんの里" });
ort("s-manzamo", "Kap Manzamo", 26.50501, 127.85026, "sicht", "bestaetigt", { nameJa: "万座毛" });

// Die dreissig Ziele aus der Ergaenzung
ort("s-nagasaki-art", "Nagasaki Prefectural Art Museum", 32.74173, 129.87049, "sicht", "bestaetigt", { nameJa: "長崎県美術館" });
ort("s-inasa", "Inasayama Aussichtspunkt", 32.75261, 129.8495, "sicht", "bestaetigt", { nameJa: "稲佐山展望台" });
ort("s-meganebashi", "Meganebashi", 32.74717, 129.8801, "sicht", "bestaetigt", { nameJa: "眼鏡橋" });
ort("s-nagasaki-hist", "Nagasaki Museum of History and Culture", 32.75299, 129.87945, "sicht", "bestaetigt", { nameJa: "長崎歴史文化博物館" });
ort("s-takeo-romon", "Takeo Onsen Romon", 33.19628, 130.01469, "sicht", "bestaetigt", { nameJa: "武雄温泉楼門" });
ort("s-shuseikan", "Shoko Shuseikan Museum", 31.61735, 130.57632, "sicht", "bestaetigt", { nameJa: "尚古集成館" });
ort("s-reimeikan", "Reimeikan Museum", 31.59863, 130.55452, "sicht", "bestaetigt", { nameJa: "黎明館" });
ort("s-kagoshima-aq", "Kagoshima City Aquarium", 31.59602, 130.56477, "sicht", "bestaetigt", { nameJa: "いおワールドかごしま水族館" });
ort("s-nezu", "Nezu Museum", 35.66224, 139.71726, "sicht", "bestaetigt", { nameJa: "根津美術館" });
ort("s-tokyo-marunouchi", "Tokyo Station Marunouchi Gebäude", 35.68115, 139.76598, "sicht", "bestaetigt", { nameJa: "東京駅丸の内駅舎" });
ort("s-shiroyama", "Shiroyama Aussichtspunkt", 31.59626, 130.55009, "sicht", "bestaetigt", { nameJa: "城山展望台" });
ort("s-zanpa", "Kap Zanpa", 26.44106, 127.71367, "sicht", "bestaetigt", { anker: "Leuchtturm Zanpa", nameJa: "残波岬灯台" });
ort("s-zakimi", "Zakimi Burgruine", 26.40657, 127.74213, "sicht", "bestaetigt", { nameJa: "座喜味城跡" });
ort("s-nakamura", "Nakamura House", 26.28984, 127.8007, "sicht", "bestaetigt", { nameJa: "中村家住宅" });
ort("s-okimu", "Okinawa Prefectural Museum & Art Museum", 26.22716, 127.69372, "sicht", "bestaetigt", { nameJa: "沖縄県立博物館・美術館" });
ort("s-fukushuen", "Fukushuen Garten", 26.21771, 127.67603, "sicht", "bestaetigt", { nameJa: "福州園" });
ort("s-kouri", "Kouri Brücke", 26.68598, 128.01694, "sicht", "bestaetigt", { nameJa: "古宇利大橋" });
ort("s-oceanic", "Oceanic Culture Museum & Planetarium", 26.69003, 127.87781, "sicht", "bestaetigt", { nameJa: "海洋文化館" });
ort("s-nact", "The National Art Center Tokyo", 35.66534, 139.72644, "sicht", "bestaetigt", { nameJa: "国立新美術館" });
ort("s-shukkeien", "Shukkeien Garten", 34.40034, 132.46745, "sicht", "bestaetigt", { nameJa: "縮景園" });
ort("s-hiroshima-art", "Hiroshima Museum of Art", 34.39862, 132.45811, "sicht", "bestaetigt", { nameJa: "ひろしま美術館" });
ort("s-orizuru", "Orizuru Tower", 34.39567, 132.45469, "sicht", "bestaetigt", { nameJa: "おりづるタワー" });
ort("s-simose", "Simose Art Museum", 34.24195, 132.22716, "sicht", "bestaetigt", { nameJa: "下瀬美術館" });
ort("s-korakuen", "Korakuen Garten", 34.66633, 133.93739, "sicht", "bestaetigt", { nameJa: "岡山後楽園" });
ort("s-okayama-castle", "Okayama Burg", 34.66518, 133.93604, "sicht", "bestaetigt", { nameJa: "岡山城" });
ort("s-ohara", "Ohara Museum of Art", 34.59603, 133.77044, "sicht", "bestaetigt", { nameJa: "大原美術館" });
ort("s-osafune", "Bizen Osafune Sword Museum", 34.72163, 134.10691, "sicht", "bestaetigt", { nameJa: "備前長船刀剣博物館" });
ort("s-kokoen", "Kokoen Garten", 34.83797, 134.68961, "sicht", "bestaetigt", { nameJa: "好古園" });
ort("s-2121", "21_21 DESIGN SIGHT", 35.66741, 139.73013, "sicht", "bestaetigt", { nameJa: "21_21 DESIGN SIGHT" });

export const ORTE = O;

/* -------------------------------------------------------- Entwürfe - */

// Ein Aufenthalt zaehlt Naechte. Ankunftstag und Weiterreisetag ergeben
// sich daraus und werden nirgends doppelt gespeichert.
const halt = (id, ortId, naechte, notizen = "", offen = null) => ({
  id,
  ortId,
  ortOffen: offen,
  naechte,
  titel: null,
  notizen,
});

const hochzeit = (id) =>
  halt(id, null, 3, "Ankunft in Tokio, Weiterreise zum Hochzeitsort, Hochzeit, Erholung. Zwei bis drei Hochzeitstage und konkrete Flugzeiten können das später verschieben.", {
    grund: "hochzeitsort",
    kandidaten: ["ort-fukuoka", "ort-kumamoto"],
  });

const ab = (mittel, vonOrt, nachOrt, hinweis = "") => ({ mittel, vonOrt, nachOrt, hinweis });

// Verbindungen eines Entwurfs entstehen aus einer kurzen Beschreibung:
// je Uebergang die Abschnitte. Fehlt ein Uebergang, wird er als noch
// offen ergaenzt, damit keine Luecke unbemerkt bleibt.
const entwurf = (id, name, beschreibung, aufenthalte, uebergaenge, extra = {}) => ({
  id,
  name,
  beschreibung,
  quelle: extra.quelle || "",
  vorschlag: extra.vorschlag !== false,
  aufenthalte,
  uebergaenge,
});

const FLUG_TOKIO_HOCHZEIT = [ab("flug", null, null, "Inlandsflug, Vorschlag. Ankunftsflughafen in Tokio und Hochzeitsort stehen noch nicht fest.")];

/* Route 1 ----------------------------------------------------------- */

const R1_ENTWUERFE = [
  entwurf(
    "r1-takeo",
    "Mit Takeo Onsen",
    "Takeo Onsen wird eine eigene Basis für Badehausarchitektur und Ruhe. Zwei Nächte sind unser Planungsvorschlag, nicht die Vorgabe der Quelle.",
    [
      hochzeit("a-r1t-1"),
      halt("a-r1t-2", "ort-takeo", 2, "Badehausarchitektur und Ruhe. Baden bleibt optional und setzt einen geeigneten Zugang voraus."),
      halt("a-r1t-3", "ort-nagasaki", 3, "Museen, Meganebashi und Inasayama gebündelt."),
      halt("a-r1t-4", "ort-kagoshima", 5, "Längere Basis für vorhandene Ziele und neue Optionen."),
      halt("a-r1t-5", "ort-tokio", 7, "Eigene Lieblingsorte."),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-takeo", "Bahn, Vorschlag. Erst mit Hochzeitsort und Fahrplan bestimmen.")],
      [ab("bahn", "ort-takeo", "ort-nagasaki", "Bahn, Vorschlag. Aus einer schematischen Linie folgt keine Direktverbindung.")],
      [ab("bahn", "ort-nagasaki", "ort-kagoshima", "Bahn, Vorschlag. Umstiege gehören zur Verbindung.")],
      [ab("auto", "ort-kagoshima", "flh-kagoshima", "Bodentransfer zum Flughafen."), ab("flug", "flh-kagoshima", null, "Flug nach Tokio. Haneda oder Narita ist noch offen.")],
    ],
    { quelle: "https://www.visit-kyushu.com/en/see-and-do/spots/takeo-onsen/" }
  ),
  entwurf(
    "r1-nagasaki",
    "Ohne Takeo, Nächte an Nagasaki",
    "Takeo bleibt ein Besuch ohne Hotelwechsel. Seine zwei Nächte gehen an Nagasaki.",
    [
      hochzeit("a-r1n-1"),
      halt("a-r1n-2", "ort-nagasaki", 5, "Takeo lässt sich von hier als Tagesbesuch oder als Zwischenhalt auf dem Weg planen."),
      halt("a-r1n-3", "ort-kagoshima", 5),
      halt("a-r1n-4", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-nagasaki", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [ab("bahn", "ort-nagasaki", "ort-kagoshima")],
      [ab("auto", "ort-kagoshima", "flh-kagoshima", "Bodentransfer zum Flughafen."), ab("flug", "flh-kagoshima", null, "Flug nach Tokio, Flughafen offen.")],
    ]
  ),
  entwurf(
    "r1-kagoshima",
    "Ohne Takeo, Nächte an Kagoshima",
    "Takeo bleibt ein Besuch ohne Hotelwechsel. Seine zwei Nächte gehen an Kagoshima.",
    [
      hochzeit("a-r1k-1"),
      halt("a-r1k-2", "ort-nagasaki", 3),
      halt("a-r1k-3", "ort-kagoshima", 7, "Viel Zeit für Küste, heiße Quellen und die Museen der Stadt."),
      halt("a-r1k-4", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-nagasaki", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [ab("bahn", "ort-nagasaki", "ort-kagoshima")],
      [ab("auto", "ort-kagoshima", "flh-kagoshima", "Bodentransfer zum Flughafen."), ab("flug", "flh-kagoshima", null, "Flug nach Tokio, Flughafen offen.")],
    ]
  ),
];

/* Route 2 ----------------------------------------------------------- */

const R2_ENTWUERFE = [
  entwurf(
    "r2-naha",
    "Mit Naha",
    "Onna ist die Basis für Küste und Ausflüge Richtung Yomitan, Motobu und Kouri. Naha bekommt zwei eigene Nächte. Die Aufteilung fünf und zwei ist unser Vorschlag.",
    [
      hochzeit("a-r2n-1"),
      halt("a-r2n-2", "ort-kagoshima", 3, "Erholung und die Ziele rund um die Bucht."),
      halt("a-r2n-3", "ort-onna", 5, "Küste und Ausflüge auf mehrere Tage verteilen, nicht alles in eine lange Rundfahrt packen."),
      halt("a-r2n-4", "ort-naha", 2, "Eigenes Reiseziel mit Museum, Garten und Flughafenanbindung."),
      halt("a-r2n-5", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-kagoshima", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [
        ab("auto", "ort-kagoshima", "flh-kagoshima", "Bodentransfer zum Flughafen."),
        ab("flug", "flh-kagoshima", "flh-naha", "Flugtage und Verbindungen später prüfen, keine Direktfluggarantie."),
        ab("auto", "flh-naha", "ort-onna", "Bodentransfer. Onna hat keinen Flughafen."),
      ],
      [ab("auto", "ort-onna", "ort-naha", "Umzug über Land.")],
      [ab("auto", "ort-naha", "flh-naha", "Bodentransfer zum Flughafen Naha."), ab("flug", "flh-naha", null, "Flug nach Tokio, Flughafen offen.")],
    ],
    { quelle: "https://visitokinawajapan.com/destinations/okinawa-main-island/southern-okinawa-main-island/naha/" }
  ),
  entwurf(
    "r2-motobu",
    "Mit Motobu im Norden",
    "Zwei der fünf Onna Nächte gehen nach Motobu. Der zusätzliche Hotelwechsel ist beabsichtigt und sichtbar. Churaumi und das Oceanic Culture Museum gehören dann zu Motobu, Kouri bleibt ein eigener Ausflug.",
    [
      hochzeit("a-r2m-1"),
      halt("a-r2m-2", "ort-kagoshima", 3),
      halt("a-r2m-3", "ort-onna", 3, "Westküste und Yomitan."),
      halt("a-r2m-4", "ort-motobu", 2, "Näher an Churaumi und dem Ocean Expo Park."),
      halt("a-r2m-5", "ort-naha", 2),
      halt("a-r2m-6", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-kagoshima", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [
        ab("auto", "ort-kagoshima", "flh-kagoshima", "Bodentransfer zum Flughafen."),
        ab("flug", "flh-kagoshima", "flh-naha"),
        ab("auto", "flh-naha", "ort-onna", "Bodentransfer. Onna hat keinen Flughafen."),
      ],
      [ab("auto", "ort-onna", "ort-motobu", "Umzug über Land.")],
      [ab("auto", "ort-motobu", "ort-naha", "Umzug über Land.")],
      [ab("auto", "ort-naha", "flh-naha", "Bodentransfer zum Flughafen Naha."), ab("flug", "flh-naha", null, "Flug nach Tokio, Flughafen offen.")],
    ],
    { vorschlag: false }
  ),
];

/* Route 3 ----------------------------------------------------------- */

const R3_UEBER_TOKIO = [ab("bahn", "ort-himeji", "ort-tokio", "Bahn, Vorschlag.")];

const R3_ENTWUERFE = [
  entwurf(
    "r3-kurashiki",
    "Kurashiki und Himeji",
    "Kurashiki ersetzt Okayama als Hotelbasis, das historische Viertel und das Ohara Museum bekommen mehr Zeit. Okayama wird von dort besucht. Himeji wird ein Aufenthalt mit zwei Nächten.",
    [
      hochzeit("a-r3k-1"),
      halt("a-r3k-2", "ort-hiroshima", 4, "Basis für die Ziele der Stadt. Simose westlich davon bleibt ein eigener Ausflug."),
      halt("a-r3k-3", "ort-kurashiki", 4, "Basis für die Region Okayama. Korakuen, Burg und Bizen Osafune von hier aus."),
      halt("a-r3k-4", "ort-himeji", 2, "Kokoen ist das konkrete Ziel. Die Burg von außen genügt, ihre Besteigung ist keine Voraussetzung."),
      halt("a-r3k-5", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-hiroshima", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [ab("bahn", "ort-hiroshima", "ort-kurashiki", "Bahn, Vorschlag. Verbindung ab diesem Ausgangspunkt neu prüfen.")],
      [ab("bahn", "ort-kurashiki", "ort-himeji", "Bahn, Vorschlag.")],
      R3_UEBER_TOKIO,
    ],
    { quelle: "https://www.himeji-machishin.jp/ryokka/kokoen/en/guidance/index.html" }
  ),
  entwurf(
    "r3-okayama",
    "Okayama als Basis",
    "Okayama bleibt die Hotelbasis statt Kurashiki. Das Bikan Viertel und das Ohara Museum werden von dort besucht.",
    [
      hochzeit("a-r3o-1"),
      halt("a-r3o-2", "ort-hiroshima", 4),
      halt("a-r3o-3", "ort-okayama", 4, "Basis für die Region. Kurashiki wird von hier aus besucht."),
      halt("a-r3o-4", "ort-himeji", 2),
      halt("a-r3o-5", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-hiroshima", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [ab("bahn", "ort-hiroshima", "ort-okayama", "Bahn, Vorschlag.")],
      [ab("bahn", "ort-okayama", "ort-himeji", "Bahn, Vorschlag.")],
      R3_UEBER_TOKIO,
    ],
    { vorschlag: false }
  ),
  entwurf(
    "r3-himeji-kurz",
    "Himeji nur eine Nacht",
    "Himeji wird auf eine Nacht verkürzt, die frei werdende Nacht geht an Kurashiki.",
    [
      hochzeit("a-r3h-1"),
      halt("a-r3h-2", "ort-hiroshima", 4),
      halt("a-r3h-3", "ort-kurashiki", 5),
      halt("a-r3h-4", "ort-himeji", 1, "Kürzerer Halt. Kokoen und die Burg von außen an einem Tag."),
      halt("a-r3h-5", "ort-tokio", 7),
    ],
    [
      FLUG_TOKIO_HOCHZEIT,
      [ab("bahn", null, "ort-hiroshima", "Bahn, Vorschlag. Startort hängt am Hochzeitsort.")],
      [ab("bahn", "ort-hiroshima", "ort-kurashiki", "Bahn, Vorschlag.")],
      [ab("bahn", "ort-kurashiki", "ort-himeji", "Bahn, Vorschlag.")],
      R3_UEBER_TOKIO,
    ],
    { vorschlag: false }
  ),
];

export const ROUTEN = [
  { id: "r1", name: "Kyushu mit Takeo Onsen und Tokio", farbe: "#2563EB", aktiverEntwurf: "r1-takeo", entwuerfe: R1_ENTWUERFE },
  { id: "r2", name: "Kyushu, Okinawa mit Naha und Tokio", farbe: "#0F766E", aktiverEntwurf: "r2-naha", entwuerfe: R2_ENTWUERFE },
  { id: "r3", name: "Hiroshima, Kurashiki, Himeji und Tokio", farbe: "#C2410C", aktiverEntwurf: "r3-kurashiki", entwuerfe: R3_ENTWUERFE },
];

/* ------------------------------------------------------ Vorschläge - */

// Alles unbekannt, solange nichts Belastbares vorliegt. Eine fehlende
// Angabe ist kein Beleg fuer einen leichten Weg.
const M = (teil = {}) => ({
  treppen: "unbekannt",
  steigung: "unbekannt",
  untergrund: "unbekannt",
  sitzen: "unbekannt",
  vomAusstieg: "unbekannt",
  taxi: "unbekannt",
  gehstrecke: "unbekannt",
  hinweis: "",
  quelle: "",
  ...teil,
});

// basis: Liste moeglicher Uebernachtungsbasen, die erste im aktiven
// Entwurf vorhandene gewinnt. Ist keine da, gilt der Vorschlag als
// verwaist und wird sichtbar zur Neuplanung markiert.
const v = (extId, ortId, name, basis, form, region, kategorien, interesse, quelle, mobi, notizen = "") => ({
  extId,
  ortId,
  name,
  basis,
  form,
  region,
  kategorien,
  interesse,
  quelleLink: quelle,
  mobilitaet: M(mobi),
  notizen,
  status: "vorgeschlagen",
  ausgeblendet: false,
  tag: null,
  reihenfolge: null,
});

const Q1 = {
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

const KYU = ["ort-nagasaki", "ort-kagoshima", "ort-takeo", "ort-fukuoka", "ort-kumamoto"];
const OKAYAMA_BASIS = ["ort-kurashiki", "ort-okayama"];
const NORD_OKINAWA = ["ort-motobu", "ort-onna"];

export const VORSCHLAEGE = {
  r1: [
    // aus Fassung 1
    v("plan-v1:nagasaki-dejima", "s-dejima", "Dejima", ["ort-nagasaki"], "local", "kyushu", ["kultur", "museum"], "Rekonstruierte Handelsinsel.", Q1.dejima, {}),
    v("plan-v1:nagasaki-glover", "s-glover", "Glover Garden", ["ort-nagasaki"], "local", "kyushu", ["kultur", "landschaft"], "Historische Wohnhäuser über dem Hafen.", Q1.glover, {
      steigung: "am Hang gelegen",
      hinweis: "Der Glover Garden liegt am Hang. Vor dem Besuch prüfen, welche Wege und Aufstiegshilfen es gibt.",
      quelle: Q1.glover,
    }),
    v("plan-v1:nagasaki-wharf", "s-dejima-wharf", "Dejima Wharf", ["ort-nagasaki"], "local", "kyushu", ["essen"], "Hafenpromenade mit Lokalen.", "", {}),
    v("plan-v1:nagasaki-kueche", null, "Regionale Küche", ["ort-nagasaki"], "local", "kyushu", ["essen"], "Noch kein Lokal ausgesucht.", "", {}, "Ort auf der Karte festlegen, sobald es eins gibt."),
    v("plan-v1:sakurajima", "s-sakurajima", "Sakurajima", ["ort-kagoshima"], "excursion", "kyushu", ["landschaft"], "Der Vulkan gegenüber der Stadt.", Q1.sakurajima, {}, "Tagesausflug mit der Fähre, keine zusätzliche Übernachtung."),
    v("plan-v1:yunohira", "s-yunohira", "Yunohira Aussichtspunkt", ["ort-kagoshima"], "excursion", "kyushu", ["landschaft"], "Blick auf den Krater.", Q1.yunohira, {
      taxi: "mit Fahrzeug anfahrbar",
      hinweis: "Yunohira lässt sich mit einem Fahrzeug anfahren. Das sagt allein noch nichts über die Wege vor Ort.",
      quelle: Q1.yunohira,
    }),
    v("plan-v1:senganen", "s-senganen", "Senganen", ["ort-kagoshima"], "local", "kyushu", ["kultur", "landschaft"], "Historischer Garten am Meer.", Q1.senganen, {
      hinweis: "Senganen ist nur teilweise zugänglich. Für den konkreten Besuch selbst nachfragen.",
      quelle: Q1.senganen,
    }),
    v("plan-v1:kueste-onsen", null, "Küste und heiße Quellen", ["ort-kagoshima"], "local", "kyushu", ["landschaft", "onsen"], "Freie Zeit ohne festes Ziel.", "", {}, "Noch offen. Ort auf der Karte festlegen."),
    v("plan-v1:omotesando", "s-omotesando", "Omotesando", ["ort-tokio"], "local", "kanto", ["architektur"], "Ladenarchitektur entlang der Allee.", Q1.architektur, {}),
    v("plan-v1:aoyama", "s-aoyama", "Minami-Aoyama", ["ort-tokio"], "local", "kanto", ["architektur"], "Ruhigere Straßen mit Architektur.", Q1.architektur, {}),
    v("plan-v1:kiyosumi", "s-kiyosumi", "Kiyosumi-Shirakawa", ["ort-tokio"], "local", "kanto", ["kultur"], "Viertel mit Kaffeeröstereien und Galerien.", Q1.kiyosumi, {}),
    v("plan-v1:mot", "s-mot", "Museum of Contemporary Art Tokyo", ["ort-tokio"], "local", "kanto", ["museum"], "Zeitgenössische Kunst in Koto.", Q1.kiyosumi, {}),
    v("plan-v1:lieblingsorte-r1", null, "Eigene Lieblingsorte", ["ort-tokio"], "local", "kanto", ["kultur"], "Platz für eigene Ziele.", "", {}, "Noch offen. Ort auf der Karte festlegen."),
    // Ergaenzung
    v("japan-extra-v1:nagasaki-prefectural-art-museum", "s-nagasaki-art", "Nagasaki Prefectural Art Museum", ["ort-nagasaki"], "local", "kyushu", ["museum", "architektur"], "Kunst und moderne Architektur am Wasser.", "https://www.discover-nagasaki.com/en/sightseeing/51763", {
      hinweis: "Museumsbesuch mit Pausen planen. Zugang zum konkreten Ausstellungsbereich prüfen.",
      quelle: "https://www.discover-nagasaki.com/en/sightseeing/51763",
    }),
    v("japan-extra-v1:mount-inasa-observatory", "s-inasa", "Inasayama Aussichtspunkt", ["ort-nagasaki"], "excursion", "kyushu", ["landschaft"], "Panorama über Stadt, Hafen und hügelige Küste.", "https://en.at-nagasaki.jp/barrierfree/64010", {
      taxi: "Bergauffahrt organisierbar",
      hinweis: "Bergauffahrt organisieren statt hinaufzulaufen. Am Aussichtspunkt ist ein Aufzug dokumentiert, Zuweg und Betrieb trotzdem prüfen.",
      quelle: "https://en.at-nagasaki.jp/barrierfree/64010",
    }),
    v("japan-extra-v1:nagasaki-meganebashi", "s-meganebashi", "Meganebashi", ["ort-nagasaki"], "local", "kyushu", ["kultur", "architektur"], "Historische steinerne Bogenbrücke am Fluss.", "https://www.discover-nagasaki.com/en/sightseeing/95", {
      hinweis: "Blick von Straßenniveau als kurze Variante. Abstieg zum Wasser und Überqueren der Brücke sind optional.",
      quelle: "https://www.discover-nagasaki.com/en/sightseeing/95",
    }),
    v("japan-extra-v1:nagasaki-history-culture-museum", "s-nagasaki-hist", "Nagasaki Museum of History and Culture", ["ort-nagasaki"], "local", "kyushu", ["museum", "kultur"], "Stadtgeschichte, Handwerk und kultureller Austausch.", "https://www.discover-nagasaki.com/en/sightseeing/60486", {
      hinweis: "Innenbesuch als Schlechtwetteroption. Anfahrt und Sitzmöglichkeiten vorab prüfen.",
      quelle: "https://www.discover-nagasaki.com/en/sightseeing/60486",
    }),
    v("japan-extra-v1:takeo-onsen-romon", "s-takeo-romon", "Takeo Onsen Romon", ["ort-takeo"], "transfer_stop", "kyushu", ["architektur", "onsen"], "Markantes historisches Tor und Badehausarchitektur.", "https://www.visit-kyushu.com/en/see-and-do/spots/takeo-onsen/", {
      taxi: "Taxi ab Bahnhof prüfen",
      hinweis: "Taxi ab Bahnhof prüfen. Zugang zu Unterkunft und Bad separat verifizieren.",
      quelle: "https://www.visit-kyushu.com/en/see-and-do/spots/takeo-onsen/",
    }, "Im Entwurf mit Takeo eine eigene Basis. Ohne diese Basis als Zwischenhalt auf dem Weg planbar."),
    v("japan-extra-v1:shoko-shuseikan", "s-shuseikan", "Shoko Shuseikan Museum", ["ort-kagoshima"], "local", "kyushu", ["museum", "architektur"], "Industriegeschichte und historische Fabrikarchitektur nahe Senganen.", "https://www.kagoshima-yokanavi.jp/en/spot/10065", {
      hinweis: "Eigenständige Zusatzoption zu Senganen. Beide nicht automatisch zusammen einplanen.",
      quelle: "https://www.kagoshima-yokanavi.jp/en/spot/10065",
    }),
    v("japan-extra-v1:reimeikan", "s-reimeikan", "Reimeikan Museum", ["ort-kagoshima"], "local", "kyushu", ["museum", "kultur"], "Geschichte und Kultur der Region.", "https://www.kagoshima-kankou.com/for/attractions/10514", {
      hinweis: "Ausstellungsauswahl mit Pausen. Konkrete Zugänge prüfen.",
      quelle: "https://www.kagoshima-kankou.com/for/attractions/10514",
    }),
    v("japan-extra-v1:kagoshima-city-aquarium", "s-kagoshima-aq", "Kagoshima City Aquarium", ["ort-kagoshima"], "local", "kyushu", ["museum"], "Meereswelt am Hafen nahe dem Sakurajima Fährterminal.", "https://www.kagoshima-kankou.com/for/attractions/10517", {
      hinweis: "Wetterunabhängige Alternative oder Zusatzbesuch, nicht zwingend am selben Tag wie Sakurajima.",
      quelle: "https://www.kagoshima-kankou.com/for/attractions/10517",
    }),
    v("japan-extra-v1:nezu-museum", "s-nezu", "Nezu Museum", ["ort-tokio"], "local", "kanto", ["museum", "architektur"], "Asiatische Kunst, Museumsarchitektur und Garten nahe Aoyama.", "https://www.nezu-muse.or.jp/en/", {
      hinweis: "Museum und Garten getrennt auswählbar halten. Gartenwege und Stufen nicht als barrierefrei voraussetzen.",
      quelle: "https://www.nezu-muse.or.jp/en/",
    }),
    v("japan-extra-v1:tokyo-station-marunouchi", "s-tokyo-marunouchi", "Tokyo Station Marunouchi Gebäude", ["ort-tokio"], "local", "kanto", ["architektur"], "Historische Backsteinfassade und Kuppelhallen.", "https://www.tokyostationcity.com/en/learning/station_building/", {
      hinweis: "Kurze Außenbesichtigung möglich. Große Bahnhofsanlage und Menschenmengen berücksichtigen.",
      quelle: "https://www.tokyostationcity.com/en/learning/station_building/",
    }, "Erst dem abschließenden Tokio Aufenthalt zuordnen."),
  ],

  r2: [
    v("plan-v1:sakurajima-r2", "s-sakurajima", "Sakurajima", ["ort-kagoshima"], "excursion", "kyushu", ["landschaft"], "Der Vulkan gegenüber der Stadt.", Q1.sakurajima, {}),
    v("plan-v1:yunohira-r2", "s-yunohira", "Yunohira Aussichtspunkt", ["ort-kagoshima"], "excursion", "kyushu", ["landschaft"], "Blick auf den Krater.", Q1.yunohira, {
      taxi: "mit Fahrzeug anfahrbar",
      hinweis: "Yunohira lässt sich mit einem Fahrzeug anfahren. Das sagt allein noch nichts über die Wege vor Ort.",
      quelle: Q1.yunohira,
    }),
    v("plan-v1:senganen-r2", "s-senganen", "Senganen", ["ort-kagoshima"], "local", "kyushu", ["kultur", "landschaft"], "Historischer Garten am Meer.", Q1.senganen, {
      hinweis: "Senganen ist nur teilweise zugänglich. Für den konkreten Besuch selbst nachfragen.",
      quelle: Q1.senganen,
    }),
    v("plan-v1:yachimun", "s-yachimun", "Yomitan Yachimun no Sato", ["ort-onna"], "excursion", "okinawa", ["kultur"], "Töpferdorf mit Werkstätten und Öfen.", Q1.yomitan, {}),
    v("plan-v1:churaumi", "s-churaumi", "Churaumi Aquarium", NORD_OKINAWA, "excursion", "okinawa", ["museum"], "Großes Aquarium im Ocean Expo Park.", Q1.churaumi, {
      hinweis: "Das Churaumi Aquarium nennt Aufzüge und Leihrollstühle. Die Verfügbarkeit ist damit nicht garantiert, vor Ort prüfen.",
      quelle: Q1.churaumi,
    }, "Im Entwurf mit Motobu gehört es zu dieser Basis."),
    v("plan-v1:freie-tage", null, "Freie Tage", ["ort-onna"], "local", "okinawa", ["landschaft"], "Zeit ohne festes Ziel.", "", {}, "Noch offen."),
    v("plan-v1:architektur-r2", null, "Architektur in Tokio", ["ort-tokio"], "local", "kanto", ["architektur"], "Noch kein einzelnes Gebäude ausgesucht.", Q1.architektur, {}, "Ort auf der Karte festlegen."),
    v("plan-v1:viertel-r2", null, "Einzelne Viertel", ["ort-tokio"], "local", "kanto", ["kultur"], "Noch offen.", "", {}),
    v("plan-v1:mot-r2", "s-mot", "Museum of Contemporary Art Tokyo", ["ort-tokio"], "local", "kanto", ["museum"], "Zeitgenössische Kunst in Koto.", Q1.kiyosumi, {}),
    v("plan-v1:lieblingsorte-r2", null, "Eigene Lieblingsorte", ["ort-tokio"], "local", "kanto", ["kultur"], "Platz für eigene Ziele.", "", {}, "Noch offen."),
    // Ergaenzung
    v("japan-extra-v1:shiroyama-observatory", "s-shiroyama", "Shiroyama Aussichtspunkt", ["ort-kagoshima"], "excursion", "kyushu", ["landschaft"], "Blick über Kagoshima auf Sakurajima.", "https://www.kagoshima-kankou.com/for/attractions/10525", {
      taxi: "Bus oder Taxi nach oben vorsehen",
      hinweis: "Bus oder Taxi nach oben vorsehen, den Waldaufstieg nicht als Standard planen. Restweg ab Ausstieg prüfen.",
      quelle: "https://www.kagoshima-kankou.com/for/attractions/10525",
    }),
    v("japan-extra-v1:cape-manzamo", "s-manzamo", "Kap Manzamo", ["ort-onna"], "local", "okinawa", ["landschaft"], "Küstenfelsen und Meerblick nahe der Basis.", Q1.onna, {
      hinweis: "Kleine Besichtigungsrunde wählen. Wind, Regen und verbleibenden Fußweg berücksichtigen.",
      quelle: Q1.onna,
    }),
    v("japan-extra-v1:cape-zanpa", "s-zanpa", "Kap Zanpa", ["ort-onna"], "excursion", "okinawa", ["landschaft"], "Leuchtturm und felsige Küstenlandschaft.", Q1.yomitan, {
      treppen: "Aufstieg im Turm optional",
      hinweis: "Leuchtturm von außen ansehen, der Treppenaufstieg ist optional. Auf befestigten oder ausgewiesenen Wegen bleiben.",
      quelle: Q1.yomitan,
    }),
    v("japan-extra-v1:zakimi-castle", "s-zakimi", "Zakimi Burgruine", ["ort-onna"], "excursion", "okinawa", ["kultur", "architektur"], "Geschwungene Steinmauern und historische Ryukyu Architektur.", "https://visitokinawajapan.com/discover/world-heritage-top/zakimi-castle-ruins/", {
      treppen: "Stufen vorhanden",
      steigung: "Anstieg vorhanden",
      hinweis: "Anspruchsvollere Option mit Anstieg und Stufen. Für den langsam gehenden Elternteil gegebenenfalls auslassen. Es gibt kein Versprechen einer stufenfreien Hauptrunde.",
      quelle: "https://visitokinawajapan.com/discover/world-heritage-top/zakimi-castle-ruins/",
    }),
    v("japan-extra-v1:nakamura-house", "s-nakamura", "Nakamura House", ["ort-onna"], "excursion", "okinawa", ["kultur", "architektur"], "Traditionelles Wohnensemble mit Okinawa Architektur.", "https://www.nakamurahouse.jp/new-english/", {
      taxi: "Taxi oder Auto sinnvoll",
      hinweis: "Eigener Abstecher Richtung Ostseite, kein Halt an der Westküste. Taxi oder Auto sinnvoll. Schwellen und Innenzugang prüfen.",
      quelle: "https://www.nakamurahouse.jp/new-english/",
    }),
    v("japan-extra-v1:okinawa-prefectural-museum", "s-okimu", "Okinawa Prefectural Museum & Art Museum", ["ort-naha"], "excursion", "okinawa", ["museum", "architektur"], "Regionalgeschichte, Kunst und markante Museumsarchitektur.", "https://okimu.jp/sp/en/", {
      hinweis: "Innenbesuch. Während der zwei Nächte in Naha einplanen, nicht auf einen knappen Flughafentransfer legen.",
      quelle: "https://okimu.jp/sp/en/",
    }),
    v("japan-extra-v1:fukushuen", "s-fukushuen", "Fukushuen Garten", ["ort-naha"], "excursion", "okinawa", ["landschaft", "kultur"], "Chinesisch geprägter Garten mit Pavillons und Wasserflächen.", "https://www.naha-navi.or.jp/en/sightseeing/fukushuen-garden/", {
      treppen: "Stufen vorhanden",
      hinweis: "Kurzen Teilbesuch planen, Stufen und Wege prüfen. Verbindung mit dem Museum nur nach verfügbarer Energie.",
      quelle: "https://www.naha-navi.or.jp/en/sightseeing/fukushuen-garden/",
    }),
    v("japan-extra-v1:kouri-bridge", "s-kouri", "Kouri Brücke und Aussicht", NORD_OKINAWA, "excursion", "okinawa", ["landschaft"], "Meerpanorama bei der Fahrt über die Brücke nach Kouri.", "https://visitokinawajapan.com/destinations/okinawa-main-island/northern-okinawa-main-island/kouri-island/", {
      taxi: "Auto oder Taxi über Yagaji",
      hinweis: "Eigener Ausflug mit Auto oder Taxi über Yagaji, keine zusätzliche Flugreise. Die Brücke muss nicht zu Fuß überquert werden, nur zulässige Haltepunkte nutzen.",
      quelle: "https://visitokinawajapan.com/destinations/okinawa-main-island/northern-okinawa-main-island/kouri-island/",
    }),
    v("japan-extra-v1:oceanic-culture-museum", "s-oceanic", "Oceanic Culture Museum & Planetarium", NORD_OKINAWA, "excursion", "okinawa", ["museum", "kultur"], "Seefahrt und Kulturen des Pazifiks im Ocean Expo Park.", "https://oki-park.jp/kaiyohaku/en/inst/35", {
      gehstrecke: "Wege im Park mitrechnen",
      hinweis: "Zusatz zum Churaumi Aquarium, aber eigenständiger Besuch. Wege im weitläufigen Park mitrechnen, Vorführungszeiten prüfen.",
      quelle: "https://oki-park.jp/kaiyohaku/en/inst/35",
    }),
    v("japan-extra-v1:national-art-center-tokyo", "s-nact", "The National Art Center Tokyo", ["ort-tokio"], "local", "kanto", ["museum", "architektur"], "Geschwungene Glasfassade und wechselnde Ausstellungen in Roppongi.", "https://www.nact.jp/english/information/barrierfree/index.html", {
      hinweis: "Offizielle Informationen zu Aufzügen und Zugänglichkeit sind verfügbar. Ausstellungskalender prüfen, es gibt keine ständig gezeigte Sammlung.",
      quelle: "https://www.nact.jp/english/information/barrierfree/index.html",
    }),
  ],

  r3: [
    v("plan-v1:friedensmuseum", "s-friedensmuseum", "Friedensmuseum", ["ort-hiroshima"], "local", "chugoku", ["museum", "kultur"], "Friedensmuseum am Gedenkpark.", "", {}),
    v("plan-v1:miyajima", "s-itsukushima", "Itsukushima Schrein auf Miyajima", ["ort-hiroshima"], "excursion", "chugoku", ["kultur", "landschaft"], "Schrein im Wasser auf der Insel Miyajima.", Q1.miyajima, {
      hinweis: "Miyajima benötigt Wege zwischen Anleger und Besichtigungszielen. Die Länge ist nicht belegt, vor Ort prüfen.",
      quelle: Q1.miyajima,
    }, "Optionaler Tagesausflug. Die Fähre ist ein Transportabschnitt, keine zusätzliche Übernachtung."),
    v("plan-v1:kurashiki-bikan", "s-kurashiki", "Kurashiki Bikan Viertel", OKAYAMA_BASIS, "local", "chugoku", ["kultur", "architektur"], "Historisches Viertel am Kanal.", Q1.kurashiki, {}),
    v("plan-v1:kurashiki-cafes", null, "Museen und Cafés in Kurashiki", OKAYAMA_BASIS, "local", "chugoku", ["museum", "essen"], "Noch offen.", Q1.kurashiki, {}, "Ort auf der Karte festlegen."),
    v("plan-v1:washuzan", "s-washuzan", "Washuzan Aussichtspunkt", OKAYAMA_BASIS, "excursion", "chugoku", ["landschaft"], "Blick auf die Seto Inlandsee.", Q1.washuzan, {}, "Optional."),
    v("plan-v1:architektur-r3", null, "Architektur in Tokio", ["ort-tokio"], "local", "kanto", ["architektur"], "Noch kein einzelnes Gebäude ausgesucht.", Q1.architektur, {}),
    v("plan-v1:ruhige-viertel", "s-kiyosumi", "Ruhige Viertel, etwa Kiyosumi-Shirakawa", ["ort-tokio"], "local", "kanto", ["kultur"], "Ruhigere Ecken abseits der großen Achsen.", Q1.kiyosumi, {}),
    v("plan-v1:lieblingsorte-r3", null, "Eigene Lieblingsorte", ["ort-tokio"], "local", "kanto", ["kultur"], "Platz für eigene Ziele.", "", {}, "Noch offen."),
    // Ergaenzung
    v("japan-extra-v1:shukkeien", "s-shukkeien", "Shukkeien Garten", ["ort-hiroshima"], "local", "chugoku", ["landschaft", "kultur"], "Teichlandschaft und Gartenkunst mitten in der Stadt.", "https://www.japan.travel/en/spot/889/", {
      hinweis: "Kurze Runde auswählen, gewölbte Brücke und anspruchsvollere Nebenwege sind optional. Keine pauschale Einstufung als barrierefrei.",
      quelle: "https://www.japan.travel/en/spot/889/",
    }),
    v("japan-extra-v1:hiroshima-museum-of-art", "s-hiroshima-art", "Hiroshima Museum of Art", ["ort-hiroshima"], "local", "chugoku", ["museum"], "Japanische und westliche Kunst in überschaubarem Umfang.", "https://www.hiroshima-museum.jp/en/collection/index.html", {
      hinweis: "In Motomachi gelegen, nicht mit dem Hiroshima Prefectural Art Museum verwechseln. Zugänge und aktuelle Ausstellung prüfen.",
      quelle: "https://www.hiroshima-museum.jp/en/collection/index.html",
    }),
    v("japan-extra-v1:orizuru-tower", "s-orizuru", "Orizuru Tower", ["ort-hiroshima"], "local", "chugoku", ["architektur", "landschaft"], "Aussichtsplattform und zeitgenössische Architektur am Friedenspark.", "https://www.orizurutower.jp/en/", {
      hinweis: "Aufzugszugang bis zum gewünschten Aussichtsniveau vorab prüfen. Den langen Rampenweg nicht als Standard planen.",
      quelle: "https://www.orizurutower.jp/en/",
    }),
    v("japan-extra-v1:simose-art-museum", "s-simose", "Simose Art Museum", ["ort-hiroshima"], "excursion", "chugoku", ["museum", "architektur"], "Kunst und Architektur von Shigeru Ban an der Küste.", "https://simose-museum.jp/en/", {
      taxi: "Anschluss ab Bahnhof, etwa Taxi",
      hinweis: "Eigener Ausflug westlich von Hiroshima. Kein einfacher Shinkansen Zwischenhalt auf dem östlichen Weg nach Okayama. Shuttle und Zugänglichkeit prüfen.",
      quelle: "https://simose-museum.jp/en/",
    }),
    v("japan-extra-v1:okayama-korakuen", "s-korakuen", "Korakuen Garten", OKAYAMA_BASIS, "local", "chugoku", ["landschaft", "kultur"], "Weite Gartenlandschaft mit Teichen und traditionellen Gebäuden.", "https://okayama-korakuen.jp/", {
      gehstrecke: "großes Gelände",
      hinweis: "Großes Gelände. Verkürzte Runde und Pausen vorsehen, aktuelle Zugänglichkeitsinformationen prüfen.",
      quelle: "https://okayama-korakuen.jp/",
    }),
    v("japan-extra-v1:okayama-castle", "s-okayama-castle", "Okayama Burg", OKAYAMA_BASIS, "local", "chugoku", ["kultur", "architektur"], "Schwarze Burgfassade und Ausstellung im rekonstruierten Gebäude.", "https://okayama-castle.jp/guide-en/", {
      treppen: "5. und 6. Stock nur über Treppen",
      hinweis: "Laut offizieller Besucherinformation gibt es einen Aufzug bis zum 4. Stock, der 5. und 6. Stock sind nur über Treppen erreichbar. Außenbesichtigung als Alternative, Zuweg ebenfalls prüfen.",
      quelle: "https://okayama-castle.jp/guide-en/",
    }),
    v("japan-extra-v1:ohara-museum", "s-ohara", "Ohara Museum of Art", ["ort-kurashiki"], "excursion", "chugoku", ["museum", "architektur"], "Kunstsammlung und Museumsarchitektur im Bikan Viertel.", "https://www.ohara.or.jp/", {
      hinweis: "Geöffnete Gebäude und Zugang einzeln prüfen.",
      quelle: "https://www.ohara.or.jp/",
    }),
    v("japan-extra-v1:bizen-osafune-sword-museum", "s-osafune", "Bizen Osafune Sword Museum", OKAYAMA_BASIS, "excursion", "chugoku", ["museum", "kultur"], "Japanische Schwerter und traditionelles Handwerk.", "https://www.japan.travel/en/spot/907/", {
      taxi: "Bahn und Taxi",
      hinweis: "Eigener Ausflug östlich von Okayama, etwa mit Bahn und Taxi. Schmiedevorführungen nur bei bestätigtem Termin einplanen.",
      quelle: "https://www.japan.travel/en/spot/907/",
    }),
    v("japan-extra-v1:himeji-kokoen", "s-kokoen", "Kokoen Garten", ["ort-himeji"], "transfer_stop", "kansai", ["landschaft", "kultur"], "Mehrere japanische Gartenbereiche neben der Burg Himeji.", "https://www.himeji-machishin.jp/ryokka/kokoen/en/guidance/index.html", {
      taxi: "Taxi oder Bus ab Bahnhof",
      steigung: "Steigungen laut offiziellem Hinweis",
      hinweis: "Offizielle Hinweise nennen Rollstuhlangebote und Steigungen. Die Burgbesteigung ist nicht erforderlich.",
      quelle: "https://www.himeji-machishin.jp/ryokka/kokoen/en/guidance/index.html",
    }),
    v("japan-extra-v1:21-21-design-sight", "s-2121", "21_21 DESIGN SIGHT", ["ort-tokio"], "local", "kanto", ["architektur", "museum"], "Designausstellungen und Architektur von Tadao Ando.", "https://www.2121designsight.jp/en/", {
      hinweis: "Ausstellungswechsel und Schließzeiten prüfen, gerade im Januar. Außenansicht und Ausstellungsbesuch getrennt behandeln.",
      quelle: "https://www.2121designsight.jp/en/",
    }),
  ],
};

export const REGIONEN = {
  kyushu: "Kyushu",
  okinawa: "Okinawa",
  chugoku: "Chugoku",
  kansai: "Kansai",
  kanto: "Kanto",
};

export const FORMEN = {
  local: "Vor Ort",
  excursion: "Ausflug",
  transfer_stop: "Zwischenhalt",
};
