/* ------------------------------------------------------------------
   Reiseplaner.

   Drei vorbereitete Routen durch Japan auf einer echten Karte, zum
   Ansehen und Vergleichen. Die Daten kommen verschluesselt aus dem
   internen Bereich und liegen nie offen im ausgelieferten HTML.

   Etappe 1: Ansicht und Vergleich. Bearbeiten, Rueckgaengig und
   Export folgen in der naechsten Etappe. Was hier schon steht, ist
   bewusst ehrlich: eine Linie behauptet nie mehr Genauigkeit, als
   ihre Daten hergeben.

   Kartenbibliothek ist Leaflet, BSD 2-Clause, liegt unter
   assets/vendor/leaflet. Die Kacheln kommen von OpenStreetMap, der
   Anbieter ist ueber KARTENANBIETER austauschbar.
------------------------------------------------------------------ */

(function (global) {
  "use strict";

  /* ------------------------------------------------- Kartenanbieter */

  // Austauschbar. Wer einen eigenen Kachelserver hat, traegt ihn hier
  // ein und setzt einst.karte auf seinen Schluessel. Die Reisedaten
  // haengen an keiner Stelle am Anbieter.
  var KARTENANBIETER = {
    osm: {
      name: "OpenStreetMap",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      maxZoom: 19,
      quelle:
        '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> Mitwirkende',
    },
  };

  /* -------------------------------------------------------- Begriffe */

  var MITTEL = {
    bahn: "Bahn",
    flug: "Flug",
    auto: "Auto",
    taxi: "Taxi",
    bus: "Bus",
    faehre: "Fähre",
    fuss: "zu Fuß",
    offen: "noch offen",
  };

  var GENAU = {
    berechnet: "Berechnete Verbindung",
    schematisch: "Schematische Verbindung",
    offen: "Verbindung noch offen",
  };

  var GENAU_ERKLAERT = {
    berechnet: "Vom Anbieter gelieferte Streckendaten.",
    schematisch: "Nur eine Planung zwischen Orten, kein tatsächlicher Streckenverlauf.",
    offen: "Ein Endpunkt oder das Verkehrsmittel steht noch nicht fest.",
  };

  var KATEGORIEN = {
    landschaft: "Landschaft",
    architektur: "Architektur",
    kultur: "Kultur",
    museum: "Museum",
    onsen: "Onsen",
    essen: "Essen",
  };

  var ORTTYP = {
    stadt: "Aufenthalt",
    sicht: "Sehenswürdigkeit",
    flughafen: "Flughafen",
    bahnhof: "Bahnhof",
    hafen: "Anleger",
    gebiet: "Gebiet",
  };

  var GENAUIGKEIT_ORT = {
    bestaetigt: "bestätigter Punkt",
    ortsanker: "Ortsanker, stellvertretend für den Ort",
    gebiet: "Gebiet, kein einzelner Punkt",
    offen: "Ort noch offen",
  };

  /* -------------------------------------------------------- Werkzeug */

  function el(tag, klasse, text) {
    var n = document.createElement(tag);
    if (klasse) n.className = klasse;
    if (text != null) n.textContent = text;
    return n;
  }

  function leer(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function sicher(text) {
    return String(text == null ? "" : text);
  }

  // Nur http und https, alles andere fliegt raus.
  function sichererLink(href) {
    if (!href) return "";
    try {
      var u = new URL(href, location.href);
      return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
    } catch (e) {
      return "";
    }
  }

  /* ------------------------------------------------- Abgeleitete Werte */

  // Reisetage entstehen aus der Reihenfolge und den Dauern. Sie werden
  // nirgends zusaetzlich gespeichert, damit es keine zwei Wahrheiten gibt.
  function tage(route) {
    var tag = 1;
    var raus = {};
    for (var i = 0; i < route.aufenthalte.length; i++) {
      var a = route.aufenthalte[i];
      raus[a.id] = { von: tag, bis: tag + a.tage - 1 };
      tag += a.tage;
    }
    raus.__summe = tag - 1;
    return raus;
  }

  function planer(wurzel, plan, einst) {
    einst = einst || {};
    var anbieter = KARTENANBIETER[einst.karte || "osm"] || KARTENANBIETER.osm;

    var S = {
      auswahl: plan.routen[0].id,
      vergleich: false,
      aktiv: null,
      filter: {},
      wenigLaufen: false,
      ansicht: "karte",
    };

    /* ---------------------------------------------- Ortsauflösung --- */

    function ort(id) {
      return id ? plan.orte[id] || null : null;
    }

    // Ein Aufenthalt mit offenem Ort hat entweder den gewaehlten
    // Hochzeitsort oder gar keinen. Beides muss die Karte aushalten.
    function ortDesAufenthalts(a) {
      if (a.ortId) return ort(a.ortId);
      if (a.ortOffen && a.ortOffen.grund === "hochzeitsort" && plan.hochzeitsort) {
        return ort(plan.hochzeitsort);
      }
      return null;
    }

    function nameDesAufenthalts(a) {
      var o = ortDesAufenthalts(a);
      if (o) return o.name;
      if (a.ortOffen && a.ortOffen.grund === "hochzeitsort") return "Hochzeitsort";
      return "Ort noch offen";
    }

    function istOffen(a) {
      return !ortDesAufenthalts(a);
    }

    function route(id) {
      for (var i = 0; i < plan.routen.length; i++) if (plan.routen[i].id === id) return plan.routen[i];
      return plan.routen[0];
    }

    function punktDerVerbindung(r, seite) {
      if (seite.art === "ereignis") {
        var e = r.ankunft.id === seite.id ? r.ankunft : r.abflug;
        return { ort: ort(e.ortId), offen: true, ereignis: e };
      }
      for (var i = 0; i < r.aufenthalte.length; i++) {
        if (r.aufenthalte[i].id === seite.id) {
          var a = r.aufenthalte[i];
          return { ort: ortDesAufenthalts(a), offen: istOffen(a), aufenthalt: a };
        }
      }
      return { ort: null, offen: true };
    }

    // Ein offener Endpunkt hat trotzdem etwas zu zeigen: seine
    // Kandidaten. Beide bekommen eine eigene, ausdruecklich als
    // Alternative gekennzeichnete Linie. Erst die Auswahl macht daraus
    // einen einzelnen Weg.
    function endpunkte(r, seite) {
      var p = punktDerVerbindung(r, seite);
      if (p.ort) return [{ ort: p.ort, alternativ: false }];
      var kandidaten = (p.aufenthalt && p.aufenthalt.ortOffen && p.aufenthalt.ortOffen.kandidaten) || [];
      return kandidaten
        .map(function (id) { return ort(id); })
        .filter(function (o) { return o && o.lat != null; })
        .map(function (o) { return { ort: o, alternativ: true }; });
    }

    // Die gespeicherte Genauigkeit gilt, aber ein zwischenzeitlich
    // gewaehlter Hochzeitsort kann eine offene Verbindung schematisch
    // machen. Nach oben wird nie aufgewertet.
    function genauigkeit(r, v) {
      if (v.genauigkeit === "berechnet") return "berechnet";
      var a = punktDerVerbindung(r, v.von);
      var b = punktDerVerbindung(r, v.nach);
      var mittelOffen = v.abschnitte.some(function (s) {
        return s.mittel === "offen";
      });
      if (!a.ort || !b.ort || mittelOffen) return "offen";
      return "schematisch";
    }

    function mittelListe(v) {
      var raus = [];
      for (var i = 0; i < v.abschnitte.length; i++) {
        var m = MITTEL[v.abschnitte[i].mittel] || v.abschnitte[i].mittel;
        if (raus.indexOf(m) < 0) raus.push(m);
      }
      return raus.join(", ");
    }

    /* ------------------------------------------------ Grundgerüst --- */

    leer(wurzel);
    wurzel.classList.add("reise");

    var kopf = el("div", "reise-kopf");
    wurzel.appendChild(kopf);

    var buehne = el("div", "reise-buehne");
    wurzel.appendChild(buehne);

    var kartenFeld = el("div", "reise-karte");
    kartenFeld.setAttribute("role", "region");
    kartenFeld.setAttribute("aria-label", "Karte der Reiserouten");
    buehne.appendChild(kartenFeld);

    var seite = el("div", "reise-seite");
    buehne.appendChild(seite);

    /* ----------------------------------------------- Kopfzeile ---- */

    var routenWahl = el("div", "reise-routen");
    routenWahl.setAttribute("role", "tablist");
    routenWahl.setAttribute("aria-label", "Reisevorschlag wählen");
    kopf.appendChild(routenWahl);

    var knoepfe = {};
    plan.routen.forEach(function (r) {
      var b = el("button", "reise-route");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.style.setProperty("--farbe", r.farbe);
      var punkt = el("span", "reise-punkt");
      punkt.setAttribute("aria-hidden", "true");
      b.appendChild(punkt);
      b.appendChild(el("span", null, r.name));
      b.addEventListener("click", function () {
        S.auswahl = r.id;
        S.aktiv = null;
        zeichne();
        aufRoute(r, true);
      });
      knoepfe[r.id] = b;
      routenWahl.appendChild(b);
    });

    var werkzeug = el("div", "reise-werkzeug");
    kopf.appendChild(werkzeug);

    var vergleichKnopf = el("button", "btn reise-klein");
    vergleichKnopf.type = "button";
    vergleichKnopf.addEventListener("click", function () {
      S.vergleich = !S.vergleich;
      zeichne();
      if (S.vergleich) aufAlles();
      else aufRoute(route(S.auswahl), true);
    });
    werkzeug.appendChild(vergleichKnopf);

    var knopfRoute = el("button", "btn reise-klein", "Gesamte Route anzeigen");
    knopfRoute.type = "button";
    knopfRoute.addEventListener("click", function () {
      if (S.vergleich) aufAlles();
      else aufRoute(route(S.auswahl), true);
    });
    werkzeug.appendChild(knopfRoute);

    var knopfJapan = el("button", "btn reise-klein", "Ganz Japan anzeigen");
    knopfJapan.type = "button";
    knopfJapan.addEventListener("click", ganzJapan);
    werkzeug.appendChild(knopfJapan);

    var umschalter = el("button", "btn reise-klein reise-umschalter");
    umschalter.type = "button";
    umschalter.addEventListener("click", function () {
      S.ansicht = S.ansicht === "karte" ? "liste" : "karte";
      wurzel.setAttribute("data-ansicht", S.ansicht);
      umschalter.textContent = S.ansicht === "karte" ? "Liste anzeigen" : "Karte anzeigen";
      if (S.ansicht === "karte" && karte) setTimeout(function () { karte.invalidateSize(); }, 60);
    });
    umschalter.textContent = "Liste anzeigen";
    werkzeug.appendChild(umschalter);
    wurzel.setAttribute("data-ansicht", "karte");

    /* --------------------------------------- Hochzeitsort und Filter */

    var steuer = el("div", "reise-steuer");
    seite.appendChild(steuer);

    var hzFeld = el("div", "reise-feld");
    hzFeld.appendChild(el("h3", null, "Hochzeitsort"));
    var hzGruppe = el("div", "reise-schalter");
    hzGruppe.setAttribute("role", "radiogroup");
    hzGruppe.setAttribute("aria-label", "Hochzeitsort");
    [
      ["", "Noch offen"],
      ["ort-fukuoka", "Fukuoka"],
      ["ort-kumamoto", "Kumamoto"],
    ].forEach(function (paar) {
      var b = el("button", "reise-wahl", paar[1]);
      b.type = "button";
      b.setAttribute("role", "radio");
      b.dataset.wert = paar[0];
      b.addEventListener("click", function () {
        plan.hochzeitsort = paar[0] || null;
        zeichne();
      });
      hzGruppe.appendChild(b);
    });
    hzFeld.appendChild(hzGruppe);
    var hzHinweis = el("p", "reise-hinweis");
    hzFeld.appendChild(hzHinweis);
    steuer.appendChild(hzFeld);

    var filterFeld = el("div", "reise-feld");
    filterFeld.appendChild(el("h3", null, "Vorschläge filtern"));
    var filterGruppe = el("div", "reise-schalter");
    Object.keys(KATEGORIEN).forEach(function (k) {
      var b = el("button", "reise-wahl", KATEGORIEN[k]);
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        S.filter[k] = !S.filter[k];
        zeichne();
      });
      b.dataset.kat = k;
      filterGruppe.appendChild(b);
    });
    filterFeld.appendChild(filterGruppe);
    steuer.appendChild(filterFeld);

    /* ------------------------------------------------------- Liste - */

    var liste = el("div", "reise-liste");
    seite.appendChild(liste);

    var legende = el("div", "reise-legende");
    seite.appendChild(legende);

    /* ------------------------------------------------------- Karte - */

    var karte = null;
    var ebene = null;
    var marker = {};

    function starteKarte() {
      if (!global.L) {
        kartenFeld.appendChild(
          el("p", "reise-fehler", "Die Karte konnte nicht geladen werden. Die Routenliste funktioniert weiterhin.")
        );
        return;
      }
      karte = global.L.map(kartenFeld, {
        zoomControl: true,
        worldCopyJump: false,
        // Ohne bewussten Griff soll die Seite beim Scrollen nicht
        // ploetzlich in die Karte zoomen.
        scrollWheelZoom: false,
      });
      karte.attributionControl.setPrefix("");
      global.L.tileLayer(anbieter.url, {
        maxZoom: anbieter.maxZoom,
        attribution: anbieter.quelle,
      }).addTo(karte);
      ebene = global.L.layerGroup().addTo(karte);
      karte.setView([35.0, 133.5], 5);

      // Der Rollbalken zoomt erst nach einem Klick in die Karte.
      karte.on("click", function () {
        if (!karte.scrollWheelZoom.enabled()) karte.scrollWheelZoom.enable();
      });
      karte.on("mouseout", function () {
        karte.scrollWheelZoom.disable();
      });
    }

    /* ---------------------------------------------------- Symbole -- */

    function symbol(art, farbe, beschriftung, betont, alternativ) {
      var k =
        "reise-marke reise-marke-" + art + (betont ? " ist-aktiv" : "") + (alternativ ? " ist-alternativ" : "");
      var inneres;
      if (art === "aufenthalt") {
        inneres = '<span class="reise-marke-zahl">' + sicher(beschriftung) + "</span>";
      } else if (art === "sicht") {
        inneres = '<span class="reise-raute"></span>';
      } else if (art === "flughafen") {
        inneres = '<span class="reise-dreieck"></span>';
      } else if (art === "bahnhof") {
        inneres = '<span class="reise-quadrat"></span>';
      } else if (art === "hafen") {
        inneres = '<span class="reise-tropfen"></span>';
      } else {
        inneres = '<span class="reise-mehrfach">' + sicher(beschriftung) + "</span>";
      }
      var groesse = art === "aufenthalt" || art === "mehrfach" ? 30 : 20;
      return global.L.divIcon({
        className: "",
        html: '<span class="' + k + '" style="--farbe:' + farbe + '">' + inneres + "</span>",
        iconSize: [groesse, groesse],
        iconAnchor: [groesse / 2, groesse / 2],
      });
    }

    /* ------------------------------------------- Punkte einsammeln - */

    // Alles, was auf die Karte soll, erst als Liste. Danach werden
    // deckungsgleiche Punkte zusammengefasst, damit Tokio bei Ankunft
    // und bei Rueckkehr auswaehlbar bleibt.
    function punkte(r, betont) {
      var t = tage(r);
      var raus = [];

      raus.push({
        art: "ereignis",
        id: r.ankunft.id,
        routeId: r.id,
        ort: ort(r.ankunft.ortId),
        titel: "Ankunft in Tokio",
        neben: "Tag 1",
        farbe: r.farbe,
        markenArt: "flughafen",
        betont: betont,
      });

      r.aufenthalte.forEach(function (a, i) {
        var o = ortDesAufenthalts(a);
        if (o) {
          raus.push({
            art: "aufenthalt",
            id: a.id,
            routeId: r.id,
            ort: o,
            titel: nameDesAufenthalts(a),
            neben: "Tag " + t[a.id].von + " bis " + t[a.id].bis,
            zahl: i + 1,
            farbe: r.farbe,
            markenArt: "aufenthalt",
            betont: betont,
          });
          return;
        }
        // Ohne festen Ort stehen die Kandidaten auf der Karte, jeder
        // ausdruecklich als Alternative.
        var kandidaten = (a.ortOffen && a.ortOffen.kandidaten) || [];
        kandidaten.forEach(function (id, k) {
          var ko = ort(id);
          if (!ko || ko.lat == null) return;
          raus.push({
            art: "aufenthalt",
            id: a.id + "@" + id,
            eintragId: a.id,
            routeId: r.id,
            ort: ko,
            titel: ko.name,
            neben: "Alternative, Tag " + t[a.id].von + " bis " + t[a.id].bis,
            zahl: i + 1,
            farbe: r.farbe,
            markenArt: "aufenthalt",
            alternativ: true,
            betont: betont,
          });
        });
      });

      r.besuche.forEach(function (b) {
        if (!sichtbar(b)) return;
        var o = ort(b.ortId);
        raus.push({
          art: "besuch",
          id: b.id,
          routeId: r.id,
          ort: o,
          titel: b.name,
          neben: b.kategorien.map(function (k) { return KATEGORIEN[k] || k; }).join(", "),
          farbe: r.farbe,
          markenArt: o ? (o.typ === "sicht" || o.typ === "gebiet" ? "sicht" : o.typ) : "sicht",
          betont: betont,
        });
      });

      return raus;
    }

    function sichtbar(b) {
      var an = Object.keys(S.filter).filter(function (k) { return S.filter[k]; });
      if (!an.length) return true;
      return b.kategorien.some(function (k) { return an.indexOf(k) >= 0; });
    }

    /* -------------------------------------------------- Verbindungen */

    // Ein Flug wird als Bogen gezeichnet, ausdruecklich als Schema.
    // Die Kruemmung ist reine Darstellung, die gespeicherten
    // Koordinaten bleiben unangetastet.
    function bogen(a, b, staerke) {
      var punkteAusgabe = [];
      var schritte = 48;
      var mx = (a[0] + b[0]) / 2;
      var my = (a[1] + b[1]) / 2;
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var laenge = Math.sqrt(dx * dx + dy * dy) || 1;
      var kx = mx + (-dy / laenge) * laenge * staerke;
      var ky = my + (dx / laenge) * laenge * staerke;
      for (var i = 0; i <= schritte; i++) {
        var t = i / schritte;
        var u = 1 - t;
        punkteAusgabe.push([
          u * u * a[0] + 2 * u * t * kx + t * t * b[0],
          u * u * a[1] + 2 * u * t * ky + t * t * b[1],
        ]);
      }
      return punkteAusgabe;
    }

    function zeichneVerbindungen(r, betont, versatz) {
      r.verbindungen.forEach(function (v) {
        var von = endpunkte(r, v.von);
        var nach = endpunkte(r, v.nach);
        if (!von.length || !nach.length) return;

        var g = genauigkeit(r, v);
        var hatFlug = v.abschnitte.some(function (s) { return s.mittel === "flug"; });

        von.forEach(function (a, ai) {
          nach.forEach(function (b, bi) {
            var alternativ = a.alternativ || b.alternativ;
            var vonXY = [a.ort.lat, a.ort.lon];
            var nachXY = [b.ort.lat, b.ort.lon];
            var linie = hatFlug
              ? bogen(vonXY, nachXY, 0.18 + versatz * 0.07 + (ai + bi) * 0.05)
              : [vonXY, nachXY];

            // Muster sagt das Verkehrsmittel, Deckkraft die Genauigkeit.
            var muster = g === "offen" ? "2 8" : hatFlug ? "10 8" : "1 7";
            if (g === "berechnet") muster = null;

            var pfad = global.L.polyline(linie, {
              color: r.farbe,
              weight: betont ? (g === "offen" ? 2 : 3) : 2,
              opacity: betont ? (alternativ ? 0.42 : g === "offen" ? 0.5 : 0.85) : 0.28,
              dashArray: muster,
              lineCap: "round",
              interactive: betont,
            });
            if (betont) {
              pfad.bindTooltip(
                sicher(GENAU[g]) +
                  ": " +
                  sicher(mittelListe(v)) +
                  (alternativ
                    ? ". Alternative, solange der Hochzeitsort offen ist: " +
                      sicher((a.alternativ ? a.ort : b.ort).name)
                    : ""),
                { sticky: true, className: "reise-tip" }
              );
            }
            pfad.addTo(ebene);
          });
        });
      });
    }

    /* ------------------------------------------------ Karte zeichnen */

    function zeichneKarte() {
      if (!karte || !ebene) return;
      ebene.clearLayers();
      marker = {};

      var routen = S.vergleich ? plan.routen : [route(S.auswahl)];

      routen.forEach(function (r, i) {
        zeichneVerbindungen(r, r.id === S.auswahl, i);
      });

      // Punkte sammeln, deckungsgleiche zusammenlegen.
      var gruppen = {};
      routen.forEach(function (r) {
        punkte(r, r.id === S.auswahl).forEach(function (p) {
          if (!p.ort || p.ort.lat == null) return;
          var schluessel = p.ort.lat.toFixed(5) + "," + p.ort.lon.toFixed(5);
          (gruppen[schluessel] = gruppen[schluessel] || []).push(p);
        });
      });

      Object.keys(gruppen).forEach(function (schluessel) {
        var g = gruppen[schluessel];
        var teile = schluessel.split(",");
        var pos = [Number(teile[0]), Number(teile[1])];

        // Betonte Punkte zuerst, damit die aktive Route oben liegt.
        g.sort(function (x, y) { return (y.betont ? 1 : 0) - (x.betont ? 1 : 0); });
        var kopfP = g[0];
        var aktivHier = g.some(function (p) {
          return S.aktiv && S.aktiv.id === (p.eintragId || p.id) && S.aktiv.routeId === p.routeId;
        });

        var m;
        if (g.length === 1) {
          m = global.L.marker(pos, {
            icon: symbol(kopfP.markenArt, kopfP.farbe, kopfP.zahl, aktivHier, kopfP.alternativ),
            keyboard: true,
            title: kopfP.titel,
            opacity: kopfP.betont ? 1 : 0.45,
            zIndexOffset: kopfP.betont ? 400 : 0,
          });
          m.on("click", function () { waehle(kopfP); });
          m.bindPopup(popupEines(kopfP), { className: "reise-popup" });
          marker[kopfP.routeId + "/" + kopfP.id] = m;
        } else {
          m = global.L.marker(pos, {
            icon: symbol("mehrfach", kopfP.farbe, String(g.length), aktivHier),
            keyboard: true,
            title: g.length + " Einträge an diesem Ort",
            zIndexOffset: 500,
          });
          m.bindPopup(popupMehrere(g), { className: "reise-popup" });
          g.forEach(function (p) { marker[p.routeId + "/" + p.id] = m; });
        }
        m.addTo(ebene);
      });
    }

    function popupEines(p) {
      var d = el("div", "reise-popup-inhalt");
      d.appendChild(el("strong", null, p.titel));
      if (p.neben) d.appendChild(el("span", "reise-popup-neben", p.neben));
      var o = p.ort;
      if (p.alternativ) {
        d.appendChild(el("span", "reise-popup-neben", "Alternative, solange der Hochzeitsort offen ist."));
      }
      if (o) {
        d.appendChild(
          el(
            "span",
            "reise-popup-quelle",
            (ORTTYP[o.typ] || o.typ) + ", " + (GENAUIGKEIT_ORT[o.genauigkeit] || o.genauigkeit)
          )
        );
      }
      return d;
    }

    function popupMehrere(g) {
      var d = el("div", "reise-popup-inhalt");
      d.appendChild(el("strong", null, g.length + " Einträge an diesem Ort"));
      var ul = el("ul", "reise-popup-liste");
      g.forEach(function (p) {
        var li = el("li");
        var b = el("button", null, p.titel + (p.neben ? " · " + p.neben : ""));
        b.type = "button";
        b.style.setProperty("--farbe", p.farbe);
        b.addEventListener("click", function () {
          if (p.routeId !== S.auswahl) S.auswahl = p.routeId;
          waehle(p);
        });
        li.appendChild(b);
        ul.appendChild(li);
      });
      d.appendChild(ul);
      return d;
    }

    function waehle(p) {
      var id = p.eintragId || p.id;
      S.aktiv = { art: p.art, id: id, routeId: p.routeId };
      zeichne();
      var eintrag = liste.querySelector('[data-eintrag="' + id + '"]');
      if (eintrag) {
        eintrag.scrollIntoView({ block: "nearest" });
        eintrag.focus({ preventScroll: true });
      }
    }

    /* ------------------------------------------------ Liste zeichnen */

    function zeichneListe() {
      leer(liste);
      var r = route(S.auswahl);
      var t = tage(r);

      var kopfZeile = el("div", "reise-listenkopf");
      var h = el("h3", null, r.name);
      h.style.setProperty("--farbe", r.farbe);
      kopfZeile.appendChild(h);
      var summe = t.__summe;
      var ab = summe - plan.zielTage;
      kopfZeile.appendChild(
        el(
          "p",
          "reise-summe",
          summe +
            " Reisetage" +
            (ab === 0
              ? ", genau das Ziel von " + plan.zielTage
              : ", " + (ab > 0 ? ab + " mehr" : -ab + " weniger") + " als das Ziel von " + plan.zielTage) +
            ". Zwischen Ankunft und Abflug liegen " +
            (summe - 1) +
            " Nächte."
        )
      );
      kopfZeile.appendChild(
        el(
          "p",
          "reise-summe reise-leise",
          plan.startdatum
            ? "Startdatum: " + plan.startdatum
            : "Kein Startdatum gesetzt. Die Tage sind relative Reisetage, keine Kalenderdaten."
        )
      );
      liste.appendChild(kopfZeile);

      liste.appendChild(zeileEreignis(r, r.ankunft, "Tag 1"));

      r.aufenthalte.forEach(function (a, i) {
        var v = r.verbindungen.filter(function (x) { return x.nach.id === a.id; })[0];
        if (v) liste.appendChild(zeileVerbindung(r, v));
        liste.appendChild(zeileAufenthalt(r, a, i, t[a.id]));
      });

      var letzte = r.verbindungen.filter(function (x) { return x.nach.id === r.abflug.id; })[0];
      if (letzte) liste.appendChild(zeileVerbindung(r, letzte));
      liste.appendChild(zeileEreignis(r, r.abflug, "Tag " + t.__summe));
    }

    function zeileEreignis(r, e, tagText) {
      var d = el("div", "reise-zeile reise-ereignis");
      d.tabIndex = 0;
      d.dataset.eintrag = e.id;
      var kopfZ = el("div", "reise-zeile-kopf");
      kopfZ.appendChild(el("span", "reise-zeile-titel", e.art === "ankunft" ? "Ankunft in Tokio" : "Rückflug ab Tokio"));
      kopfZ.appendChild(el("span", "reise-zeile-neben", tagText));
      d.appendChild(kopfZ);
      d.appendChild(el("p", "reise-zeile-text", e.text));
      if (e.flughafenOffen && e.flughafenOffen.length) {
        var namen = e.flughafenOffen.map(function (id) { return ort(id).name; }).join(" oder ");
        d.appendChild(el("p", "reise-marke-offen", "Flughafen noch offen: " + namen));
      }
      d.addEventListener("click", function () { waehle({ art: "ereignis", id: e.id, routeId: r.id }); });
      d.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); d.click(); }
      });
      return d;
    }

    function zeileVerbindung(r, v) {
      var g = genauigkeit(r, v);
      var d = el("div", "reise-verbindung reise-genau-" + g);
      var kopfZ = el("div", "reise-zeile-kopf");
      kopfZ.appendChild(el("span", "reise-zeile-titel", mittelListe(v)));
      kopfZ.appendChild(el("span", "reise-marke-genau", GENAU[g]));
      d.appendChild(kopfZ);

      if (v.abschnitte.length > 1) {
        var ul = el("ul", "reise-abschnitte");
        v.abschnitte.forEach(function (s) {
          var von = ort(s.vonOrt);
          var nach = ort(s.nachOrt);
          ul.appendChild(
            el(
              "li",
              null,
              (MITTEL[s.mittel] || s.mittel) +
                ": " +
                (von ? von.name : "offen") +
                " nach " +
                (nach ? nach.name : "offen")
            )
          );
        });
        d.appendChild(ul);
      }

      d.appendChild(
        el(
          "p",
          "reise-zeile-text reise-leise",
          (v.hinweis ? v.hinweis + " " : "") +
            GENAU_ERKLAERT[g] +
            (v.dauerMin == null && v.distanzKm == null
              ? " Fahrzeit und Entfernung sind unbekannt."
              : "")
        )
      );
      return d;
    }

    function zeileAufenthalt(r, a, i, spanne) {
      var offen = istOffen(a);
      var d = el("div", "reise-zeile reise-aufenthalt" + (offen ? " ist-offen" : ""));
      d.tabIndex = 0;
      d.dataset.eintrag = a.id;
      if (S.aktiv && S.aktiv.id === a.id) d.classList.add("ist-aktiv");
      d.style.setProperty("--farbe", r.farbe);

      var kopfZ = el("div", "reise-zeile-kopf");
      var num = el("span", "reise-nummer", String(i + 1));
      num.setAttribute("aria-hidden", "true");
      kopfZ.appendChild(num);
      kopfZ.appendChild(el("span", "reise-zeile-titel", nameDesAufenthalts(a)));
      kopfZ.appendChild(el("span", "reise-zeile-neben", "Tag " + spanne.von + " bis " + spanne.bis + ", " + a.tage + " Tage"));
      d.appendChild(kopfZ);

      if (offen && a.ortOffen) {
        var namen = (a.ortOffen.kandidaten || []).map(function (id) { return ort(id).name; }).join(" oder ");
        d.appendChild(el("p", "reise-marke-offen", "Ort noch offen: " + namen));
      }
      if (a.notizen) d.appendChild(el("p", "reise-zeile-text", a.notizen));

      var besuche = r.besuche.filter(function (b) { return b.aufenthaltId === a.id && sichtbar(b); });
      if (besuche.length) {
        var ul = el("ul", "reise-vorschlaege");
        besuche.forEach(function (b) { ul.appendChild(zeileBesuch(r, b)); });
        d.appendChild(ul);
      }

      d.addEventListener("click", function (ev) {
        if (ev.target.closest("a")) return;
        waehle({ art: "aufenthalt", id: a.id, routeId: r.id });
      });
      d.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); d.click(); }
      });
      return d;
    }

    function zeileBesuch(r, b) {
      var o = ort(b.ortId);
      var li = el("li", "reise-vorschlag" + (o ? "" : " ist-offen"));
      li.dataset.eintrag = b.id;
      if (S.aktiv && S.aktiv.id === b.id) li.classList.add("ist-aktiv");

      var kopfZ = el("div", "reise-zeile-kopf");
      kopfZ.appendChild(el("span", "reise-zeile-titel", b.name));
      var kats = b.kategorien.map(function (k) { return KATEGORIEN[k] || k; }).join(", ");
      if (kats) kopfZ.appendChild(el("span", "reise-zeile-neben", kats));
      li.appendChild(kopfZ);

      if (!o) {
        li.appendChild(el("p", "reise-marke-offen", "Ort auf Karte festlegen"));
      } else if (o.genauigkeit !== "bestaetigt") {
        li.appendChild(el("p", "reise-leise reise-zeile-text", GENAUIGKEIT_ORT[o.genauigkeit] + (o.anker ? ": " + o.anker : "")));
      }

      if (b.notizen) li.appendChild(el("p", "reise-zeile-text", b.notizen));

      var m = b.mobilitaet || {};
      if (m.hinweis) {
        var w = el("p", "reise-mobil");
        w.appendChild(el("strong", null, "Zum Gehen: "));
        w.appendChild(document.createTextNode(m.hinweis));
        li.appendChild(w);
      } else {
        li.appendChild(el("p", "reise-mobil reise-leise", "Zum Gehen: noch nicht geprüft."));
      }

      var href = sichererLink(b.quelleLink);
      if (href) {
        var a = el("a", "reise-quelle", "Quelle");
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        li.appendChild(a);
      }

      li.addEventListener("click", function (ev) {
        if (ev.target.closest("a")) return;
        ev.stopPropagation();
        waehle({ art: "besuch", id: b.id, routeId: r.id });
      });
      return li;
    }

    /* ---------------------------------------------------- Legende -- */

    function zeichneLegende() {
      leer(legende);
      legende.appendChild(el("h3", null, "Legende"));

      var g1 = el("div", "reise-legende-teil");
      g1.appendChild(el("h4", null, "Reisevorschlag, an der Farbe"));
      var ul1 = el("ul");
      plan.routen.forEach(function (r) {
        var li = el("li");
        var s = el("span", "reise-strich");
        s.style.setProperty("--farbe", r.farbe);
        li.appendChild(s);
        li.appendChild(document.createTextNode(r.name));
        ul1.appendChild(li);
      });
      g1.appendChild(ul1);
      legende.appendChild(g1);

      var g2 = el("div", "reise-legende-teil");
      g2.appendChild(el("h4", null, "Art des Punktes, an der Form"));
      var ul2 = el("ul");
      [
        ["aufenthalt", "Aufenthalt, mit seiner Nummer"],
        ["sicht", "Sehenswürdigkeit"],
        ["flughafen", "Flughafen"],
        ["bahnhof", "Bahnhof"],
        ["hafen", "Anleger"],
        ["mehrfach", "Mehrere Einträge am selben Ort"],
      ].forEach(function (paar) {
        var li = el("li");
        var s = el("span", "reise-marke reise-marke-" + paar[0]);
        s.setAttribute("aria-hidden", "true");
        if (paar[0] === "aufenthalt") s.appendChild(el("span", "reise-marke-zahl", "1"));
        else if (paar[0] === "sicht") s.appendChild(el("span", "reise-raute"));
        else if (paar[0] === "flughafen") s.appendChild(el("span", "reise-dreieck"));
        else if (paar[0] === "bahnhof") s.appendChild(el("span", "reise-quadrat"));
        else if (paar[0] === "hafen") s.appendChild(el("span", "reise-tropfen"));
        else s.appendChild(el("span", "reise-mehrfach", "2"));
        li.appendChild(s);
        li.appendChild(document.createTextNode(paar[1]));
        ul2.appendChild(li);
      });
      g2.appendChild(ul2);
      legende.appendChild(g2);

      var g3 = el("div", "reise-legende-teil");
      g3.appendChild(el("h4", null, "Verbindung, an Muster und Text"));
      var ul3 = el("ul");
      [
        ["berechnet", "Berechnete Verbindung, durchgezogen. " + GENAU_ERKLAERT.berechnet],
        ["schematisch", "Schematische Verbindung, gestrichelt. " + GENAU_ERKLAERT.schematisch],
        ["offen", "Verbindung noch offen, weit gepunktet. " + GENAU_ERKLAERT.offen],
        ["flug", "Flüge als Bogen. Das ist keine tatsächliche Flugbahn."],
      ].forEach(function (paar) {
        var li = el("li");
        var s = el("span", "reise-strich reise-strich-" + paar[0]);
        li.appendChild(s);
        li.appendChild(document.createTextNode(paar[1]));
        ul3.appendChild(li);
      });
      g3.appendChild(ul3);
      legende.appendChild(g3);

      legende.appendChild(
        el(
          "p",
          "reise-leise",
          "Die Farbe steht für den Reisevorschlag, das Muster für Verkehrsmittel und Genauigkeit. " +
            "Kartendaten von " + anbieter.name + ", die Quellenangabe steht in der Karte."
        )
      );
    }

    /* --------------------------------------------------- Ausschnitt */

    function grenzen(routen) {
      var punkteAlle = [];
      routen.forEach(function (r) {
        punkte(r, true).forEach(function (p) {
          if (p.ort && p.ort.lat != null) punkteAlle.push([p.ort.lat, p.ort.lon]);
        });
      });
      return punkteAlle;
    }

    function aufRoute(r, sanft) {
      if (!karte) return;
      var p = grenzen([r]);
      if (!p.length) return;
      karte.fitBounds(global.L.latLngBounds(p).pad(0.18), { animate: !!sanft });
    }

    function aufAlles() {
      if (!karte) return;
      var p = grenzen(plan.routen);
      if (!p.length) return;
      karte.fitBounds(global.L.latLngBounds(p).pad(0.12));
    }

    // Okinawa muss mit hineinpassen, deshalb reicht Japan hier von
    // Okinawa im Suedwesten bis Hokkaido im Nordosten.
    function ganzJapan() {
      if (!karte) return;
      karte.fitBounds(global.L.latLngBounds([[24.0, 122.5], [45.7, 146.0]]), { animate: true });
    }

    /* --------------------------------------------------- Neuzeichnen */

    function zeichne() {
      plan.routen.forEach(function (r) {
        var b = knoepfe[r.id];
        var an = r.id === S.auswahl;
        b.classList.toggle("ist-aktiv", an);
        b.setAttribute("aria-selected", an ? "true" : "false");
      });

      vergleichKnopf.textContent = S.vergleich ? "Nur diese Route" : "Routen vergleichen";
      vergleichKnopf.setAttribute("aria-pressed", S.vergleich ? "true" : "false");
      knopfRoute.textContent = S.vergleich ? "Alle Routen anzeigen" : "Gesamte Route anzeigen";

      Array.prototype.forEach.call(hzGruppe.children, function (b) {
        var an = (plan.hochzeitsort || "") === b.dataset.wert;
        b.classList.toggle("ist-aktiv", an);
        b.setAttribute("aria-checked", an ? "true" : "false");
      });
      hzHinweis.textContent = plan.hochzeitsort
        ? "Gewählt: " + ort(plan.hochzeitsort).name + ". Nur die daran gebundenen Orte und Verbindungen ändern sich."
        : "Solange der Ort offen ist, sind Fukuoka und Kumamoto Alternativen. Die übrigen Etappen bleiben trotzdem nutzbar.";

      Array.prototype.forEach.call(filterGruppe.children, function (b) {
        var an = !!S.filter[b.dataset.kat];
        b.classList.toggle("ist-aktiv", an);
        b.setAttribute("aria-pressed", an ? "true" : "false");
      });

      zeichneListe();
      zeichneKarte();
      zeichneLegende();
    }

    starteKarte();
    zeichne();
    if (karte) setTimeout(function () { karte.invalidateSize(); aufRoute(route(S.auswahl), false); }, 80);

    return {
      zeichne: zeichne,
      karte: function () { return karte; },
      zustand: S,
    };
  }

  global.reiseplaner = planer;
})(window);
