/* ------------------------------------------------------------------
   Reiseplaner.

   Drei Reisevorschlaege durch Japan auf einer echten Karte, zum
   Ansehen und Vergleichen. Die Daten kommen verschluesselt aus dem
   internen Bereich und liegen nie offen im ausgelieferten HTML.

   Gezaehlt werden Naechte. 21 Reisetage sind 20 Naechte. Ein
   Transfertag gehoert zu beiden angrenzenden Aufenthalten und zaehlt
   trotzdem nur einmal. Tag 21 ist der Rueckflug, keine Hotelnacht.

   Jede Route hat mehrere Entwuerfe, genau einer ist aktiv. Vorschlaege
   haengen an Basisorten, nicht an festen Tagesnummern. Faellt die
   Basis im aktiven Entwurf weg, wird der Vorschlag als verwaist
   markiert und nicht geloescht.

   Was hier steht, ist bewusst ehrlich: eine Linie behauptet nie mehr
   Genauigkeit, als ihre Daten hergeben, und ein Ort gilt nie als
   barrierefrei, nur weil nichts Gegenteiliges bekannt ist.

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
    bahn: "Bahn", flug: "Flug", auto: "Auto", taxi: "Taxi",
    bus: "Bus", faehre: "Fähre", fuss: "zu Fuß", offen: "noch offen",
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
    landschaft: "Landschaft", architektur: "Architektur", kultur: "Kultur",
    museum: "Museum", onsen: "Onsen", essen: "Essen",
  };

  var REGIONEN = {
    kyushu: "Kyushu", okinawa: "Okinawa", chugoku: "Chugoku",
    kansai: "Kansai", kanto: "Kanto",
  };

  var FORMEN = { local: "Vor Ort", excursion: "Ausflug", transfer_stop: "Zwischenhalt" };

  var ORTTYP = {
    stadt: "Aufenthalt", sicht: "Sehenswürdigkeit", flughafen: "Flughafen",
    bahnhof: "Bahnhof", hafen: "Anleger", gebiet: "Gebiet",
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

  function sicher(t) { return String(t == null ? "" : t); }

  // Nur http und https, alles andere fliegt raus.
  function sichererLink(href) {
    if (!href) return "";
    try {
      var u = new URL(href, location.href);
      return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
    } catch (e) { return ""; }
  }

  function naechteWort(n) { return n + (n === 1 ? " Nacht" : " Nächte"); }

  /* ---------------------------------------------------------- Planer */

  function planer(wurzel, plan, einst) {
    einst = einst || {};
    var anbieter = KARTENANBIETER[einst.karte || "osm"] || KARTENANBIETER.osm;
    var zielNaechte = plan.zielNaechte || 20;

    var S = {
      auswahl: plan.routen[0].id,
      vergleich: false,
      aktiv: null,
      filterKat: {},
      filterRegion: {},
      filterForm: {},
      nurOffeneIdeen: false,
      ansicht: "karte",
      tafel: "plan",
      bearbeiten: false,
      // Die Werkstatt haengt sich hier ein, sobald sie geladen ist.
      werkstatt: null,
    };

    /* -------------------------------------------- Daten auflösen --- */

    function ort(id) { return id ? plan.orte[id] || null : null; }

    function route(id) {
      for (var i = 0; i < plan.routen.length; i++) if (plan.routen[i].id === id) return plan.routen[i];
      return plan.routen[0];
    }

    function entwurf(r) {
      for (var i = 0; i < r.entwuerfe.length; i++) if (r.entwuerfe[i].id === r.aktiverEntwurf) return r.entwuerfe[i];
      return r.entwuerfe[0];
    }

    // Ankunftstag und Weiterreisetag ergeben sich aus der Folge der
    // Naechte. Der Transfertag steht bei beiden Aufenthalten und wird
    // trotzdem nur einmal gezaehlt.
    function tage(e) {
      var tag = 1;
      var raus = { __naechte: 0 };
      for (var i = 0; i < e.aufenthalte.length; i++) {
        var a = e.aufenthalte[i];
        raus[a.id] = { an: tag, weiter: tag + a.naechte, naechte: a.naechte };
        tag += a.naechte;
        raus.__naechte += a.naechte;
      }
      raus.__abflug = tag;
      return raus;
    }

    // Ein Aufenthalt mit offenem Ort nimmt den gewaehlten Hochzeitsort,
    // solange es einen gibt.
    function ortDesHalts(a) {
      if (a.ortId) return ort(a.ortId);
      if (a.ortOffen && a.ortOffen.grund === "hochzeitsort" && plan.hochzeitsort) return ort(plan.hochzeitsort);
      return null;
    }

    function nameDesHalts(a) {
      var o = ortDesHalts(a);
      if (o) return o.name;
      if (a.ortOffen && a.ortOffen.grund === "hochzeitsort") return "Hochzeitsort";
      return "Ort noch offen";
    }

    function istOffen(a) { return !ortDesHalts(a); }

    // Die Basis eines Vorschlags ist der erste Aufenthalt des aktiven
    // Entwurfs, dessen Ort in seiner Basisliste steht. Findet sich
    // keiner, ist der Vorschlag verwaist.
    function basisFuer(b, e) {
      var liste = b.basis || [];
      for (var i = 0; i < liste.length; i++) {
        for (var k = 0; k < e.aufenthalte.length; k++) {
          var a = e.aufenthalte[k];
          var o = ortDesHalts(a);
          if (o && o.id === liste[i]) return a;
        }
      }
      return null;
    }

    function sichtbareBesuche(r) {
      return r.besuche.filter(function (b) { return !b.ausgeblendet; });
    }

    function punktDerVerbindung(r, e, seite) {
      if (seite.art === "ereignis") {
        var ev = r.ankunft.id === seite.id ? r.ankunft : r.abflug;
        return { ort: ort(ev.ortId), ereignis: ev };
      }
      for (var i = 0; i < e.aufenthalte.length; i++) {
        if (e.aufenthalte[i].id === seite.id) {
          var a = e.aufenthalte[i];
          return { ort: ortDesHalts(a), aufenthalt: a };
        }
      }
      return { ort: null };
    }

    // Ein offener Endpunkt zeigt trotzdem seine Kandidaten, jeder
    // ausdruecklich als Alternative.
    function endpunkte(r, e, seite) {
      var p = punktDerVerbindung(r, e, seite);
      if (p.ort) return [{ ort: p.ort, alternativ: false }];
      var k = (p.aufenthalt && p.aufenthalt.ortOffen && p.aufenthalt.ortOffen.kandidaten) || [];
      return k.map(ort).filter(function (o) { return o && o.lat != null; })
        .map(function (o) { return { ort: o, alternativ: true }; });
    }

    // Die gespeicherte Genauigkeit gilt, aber ein zwischenzeitlich
    // gewaehlter Hochzeitsort kann eine offene Verbindung schematisch
    // machen. Nach oben wird nie aufgewertet.
    function genauigkeit(r, e, v) {
      if (v.genauigkeit === "berechnet") return "berechnet";
      var a = punktDerVerbindung(r, e, v.von);
      var b = punktDerVerbindung(r, e, v.nach);
      var offen = v.abschnitte.some(function (s) { return s.mittel === "offen"; });
      if (!a.ort || !b.ort || offen) return "offen";
      return "schematisch";
    }

    function mittelListe(v) {
      var raus = [];
      v.abschnitte.forEach(function (s) {
        var m = MITTEL[s.mittel] || s.mittel;
        if (raus.indexOf(m) < 0) raus.push(m);
      });
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
      if (S.vergleich) aufAlles(); else aufRoute(route(S.auswahl), true);
    });
    werkzeug.appendChild(vergleichKnopf);

    var knopfRoute = el("button", "btn reise-klein", "Gesamte Route anzeigen");
    knopfRoute.type = "button";
    knopfRoute.addEventListener("click", function () {
      if (S.vergleich) aufAlles(); else aufRoute(route(S.auswahl), true);
    });
    werkzeug.appendChild(knopfRoute);

    var knopfJapan = el("button", "btn reise-klein", "Ganz Japan anzeigen");
    knopfJapan.type = "button";
    knopfJapan.addEventListener("click", ganzJapan);
    werkzeug.appendChild(knopfJapan);

    var umschalter = el("button", "btn reise-klein reise-umschalter");
    umschalter.type = "button";
    umschalter.textContent = "Liste anzeigen";
    umschalter.addEventListener("click", function () {
      S.ansicht = S.ansicht === "karte" ? "liste" : "karte";
      wurzel.setAttribute("data-ansicht", S.ansicht);
      umschalter.textContent = S.ansicht === "karte" ? "Liste anzeigen" : "Karte anzeigen";
      if (S.ansicht === "karte" && karte) setTimeout(function () { karte.invalidateSize(); }, 60);
    });
    werkzeug.appendChild(umschalter);

    // Ansehen und Bearbeiten sind getrennt. Solange nicht bearbeitet
    // wird, verschiebt kein Klick und kein Zug etwas.
    var modusKnopf = el("button", "btn reise-klein reise-modus", "Bearbeiten");
    modusKnopf.type = "button";
    modusKnopf.setAttribute("aria-pressed", "false");
    modusKnopf.addEventListener("click", function () { modus(!S.bearbeiten); });
    werkzeug.appendChild(modusKnopf);

    wurzel.setAttribute("data-ansicht", "karte");
    wurzel.setAttribute("data-modus", "ansehen");

    function modus(an) {
      S.bearbeiten = !!an;
      wurzel.setAttribute("data-modus", S.bearbeiten ? "bearbeiten" : "ansehen");
      modusKnopf.textContent = S.bearbeiten ? "Bearbeiten beenden" : "Bearbeiten";
      modusKnopf.setAttribute("aria-pressed", S.bearbeiten ? "true" : "false");
      if (S.bearbeiten && !S.werkstatt && typeof einst.werkstatt === "function") {
        einst.werkstatt(schnittstelle);
      }
      zeichne();
    }

    /* ------------------------------------------------- Entwürfe ---- */

    var entwurfFeld = el("div", "reise-feld reise-entwuerfe");
    entwurfFeld.appendChild(el("h3", null, "Entwurf dieser Route"));
    var entwurfGruppe = el("div", "reise-schalter");
    entwurfGruppe.setAttribute("role", "radiogroup");
    entwurfGruppe.setAttribute("aria-label", "Entwurf wählen");
    entwurfFeld.appendChild(entwurfGruppe);
    var entwurfText = el("p", "reise-hinweis");
    entwurfFeld.appendChild(entwurfText);
    seite.appendChild(entwurfFeld);

    /* --------------------------------------- Hochzeitsort und Filter */

    var hzFeld = el("div", "reise-feld");
    hzFeld.appendChild(el("h3", null, "Hochzeitsort"));
    var hzGruppe = el("div", "reise-schalter");
    hzGruppe.setAttribute("role", "radiogroup");
    hzGruppe.setAttribute("aria-label", "Hochzeitsort");
    [["", "Noch offen"], ["ort-fukuoka", "Fukuoka"], ["ort-kumamoto", "Kumamoto"]].forEach(function (paar) {
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
    seite.appendChild(hzFeld);

    /* ---------------------------------------------------- Tafeln --- */

    var tafelWahl = el("div", "reise-tafeln");
    tafelWahl.setAttribute("role", "tablist");
    tafelWahl.setAttribute("aria-label", "Ansicht wählen");
    var tafelKnoepfe = {};
    [["plan", "Reiseplan"], ["ideen", "Weitere Ideen"]].forEach(function (paar) {
      var b = el("button", "reise-tafel", paar[1]);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { S.tafel = paar[0]; zeichne(); });
      tafelKnoepfe[paar[0]] = b;
      tafelWahl.appendChild(b);
    });
    seite.appendChild(tafelWahl);

    var liste = el("div", "reise-liste");
    seite.appendChild(liste);

    var ideen = el("div", "reise-ideen");
    seite.appendChild(ideen);

    var legende = el("div", "reise-legende");
    seite.appendChild(legende);

    /* ------------------------------------------------------- Karte - */

    var karte = null, ebene = null, marker = {};

    function starteKarte() {
      if (!global.L) {
        kartenFeld.appendChild(el("p", "reise-fehler",
          "Die Karte konnte nicht geladen werden. Reiseplan und weitere Ideen funktionieren weiterhin."));
        return;
      }
      karte = global.L.map(kartenFeld, { zoomControl: true, worldCopyJump: false, scrollWheelZoom: false });
      karte.attributionControl.setPrefix("");
      global.L.tileLayer(anbieter.url, { maxZoom: anbieter.maxZoom, attribution: anbieter.quelle }).addTo(karte);
      ebene = global.L.layerGroup().addTo(karte);
      karte.setView([35.0, 133.5], 5);
      // Der Rollbalken zoomt erst nach einem Klick in die Karte.
      karte.on("click", function () { if (!karte.scrollWheelZoom.enabled()) karte.scrollWheelZoom.enable(); });
      karte.on("mouseout", function () { karte.scrollWheelZoom.disable(); });
    }

    /* ---------------------------------------------------- Symbole -- */

    function symbol(art, farbe, beschriftung, betont, alternativ) {
      var k = "reise-marke reise-marke-" + art + (betont ? " ist-aktiv" : "") + (alternativ ? " ist-alternativ" : "");
      var inneres;
      if (art === "aufenthalt") inneres = '<span class="reise-marke-zahl">' + sicher(beschriftung) + "</span>";
      else if (art === "sicht") inneres = '<span class="reise-raute"></span>';
      else if (art === "flughafen") inneres = '<span class="reise-dreieck"></span>';
      else if (art === "bahnhof") inneres = '<span class="reise-quadrat"></span>';
      else if (art === "hafen") inneres = '<span class="reise-tropfen"></span>';
      else inneres = '<span class="reise-mehrfach">' + sicher(beschriftung) + "</span>";
      var g = art === "aufenthalt" || art === "mehrfach" ? 30 : 20;
      return global.L.divIcon({
        className: "",
        html: '<span class="' + k + '" style="--farbe:' + farbe + '">' + inneres + "</span>",
        iconSize: [g, g],
        iconAnchor: [g / 2, g / 2],
      });
    }

    /* ------------------------------------------- Punkte einsammeln - */

    function passtFilter(b) {
      var kats = Object.keys(S.filterKat).filter(function (k) { return S.filterKat[k]; });
      if (kats.length && !b.kategorien.some(function (k) { return kats.indexOf(k) >= 0; })) return false;
      var reg = Object.keys(S.filterRegion).filter(function (k) { return S.filterRegion[k]; });
      if (reg.length && reg.indexOf(b.region) < 0) return false;
      var frm = Object.keys(S.filterForm).filter(function (k) { return S.filterForm[k]; });
      if (frm.length && frm.indexOf(b.form) < 0) return false;
      return true;
    }

    function punkte(r, betont) {
      var e = entwurf(r);
      var t = tage(e);
      var raus = [];

      raus.push({
        art: "ereignis", id: r.ankunft.id, routeId: r.id, ort: ort(r.ankunft.ortId),
        titel: "Ankunft in Tokio", neben: "Tag 1", farbe: r.farbe,
        markenArt: "flughafen", betont: betont,
      });

      e.aufenthalte.forEach(function (a, i) {
        var o = ortDesHalts(a);
        var neben = "Tag " + t[a.id].an + " bis " + t[a.id].weiter + ", " + naechteWort(a.naechte);
        if (o) {
          raus.push({
            art: "aufenthalt", id: a.id, routeId: r.id, ort: o, titel: nameDesHalts(a),
            neben: neben, zahl: i + 1, farbe: r.farbe, markenArt: "aufenthalt", betont: betont,
          });
          return;
        }
        ((a.ortOffen && a.ortOffen.kandidaten) || []).forEach(function (id) {
          var ko = ort(id);
          if (!ko || ko.lat == null) return;
          raus.push({
            art: "aufenthalt", id: a.id + "@" + id, eintragId: a.id, routeId: r.id, ort: ko,
            titel: ko.name, neben: "Alternative, " + neben, zahl: i + 1, farbe: r.farbe,
            markenArt: "aufenthalt", alternativ: true, betont: betont,
          });
        });
      });

      sichtbareBesuche(r).forEach(function (b) {
        if (!passtFilter(b)) return;
        var o = ort(b.ortId);
        if (!o || o.lat == null) return;
        raus.push({
          art: "besuch", id: b.id, routeId: r.id, ort: o, titel: b.name,
          neben: (FORMEN[b.form] || b.form) + (basisFuer(b, e) ? "" : ", ohne Basis"),
          farbe: r.farbe,
          markenArt: o.typ === "sicht" || o.typ === "gebiet" ? "sicht" : o.typ,
          verwaist: !basisFuer(b, e),
          betont: betont,
        });
      });

      return raus;
    }

    /* -------------------------------------------------- Verbindungen */

    // Ein Flug wird als Bogen gezeichnet, ausdruecklich als Schema. Die
    // Kruemmung ist reine Darstellung, die gespeicherten Koordinaten
    // bleiben unangetastet.
    function bogen(a, b, staerke) {
      var raus = [], schritte = 48;
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var l = Math.sqrt(dx * dx + dy * dy) || 1;
      var kx = mx + (-dy / l) * l * staerke, ky = my + (dx / l) * l * staerke;
      for (var i = 0; i <= schritte; i++) {
        var t = i / schritte, u = 1 - t;
        raus.push([u * u * a[0] + 2 * u * t * kx + t * t * b[0], u * u * a[1] + 2 * u * t * ky + t * t * b[1]]);
      }
      return raus;
    }

    function zeichneVerbindungen(r, betont, versatz) {
      var e = entwurf(r);
      e.verbindungen.forEach(function (v) {
        var von = endpunkte(r, e, v.von), nach = endpunkte(r, e, v.nach);
        if (!von.length || !nach.length) return;
        var g = genauigkeit(r, e, v);
        var hatFlug = v.abschnitte.some(function (s) { return s.mittel === "flug"; });

        von.forEach(function (a, ai) {
          nach.forEach(function (b, bi) {
            var alternativ = a.alternativ || b.alternativ;
            var p1 = [a.ort.lat, a.ort.lon], p2 = [b.ort.lat, b.ort.lon];
            var linie = hatFlug ? bogen(p1, p2, 0.18 + versatz * 0.07 + (ai + bi) * 0.05) : [p1, p2];
            // Muster sagt das Verkehrsmittel, Deckkraft die Genauigkeit.
            var muster = g === "offen" ? "2 8" : hatFlug ? "10 8" : "1 7";
            if (g === "berechnet") muster = null;

            var pfad = global.L.polyline(linie, {
              color: r.farbe,
              weight: betont ? (g === "offen" ? 2 : 3) : 2,
              opacity: betont ? (alternativ ? 0.42 : g === "offen" ? 0.5 : 0.85) : 0.28,
              dashArray: muster, lineCap: "round", interactive: betont,
            });
            if (betont) {
              pfad.bindTooltip(
                sicher(GENAU[g]) + ": " + sicher(mittelListe(v)) +
                  (alternativ ? ". Alternative, solange der Hochzeitsort offen ist: " + sicher((a.alternativ ? a.ort : b.ort).name) : ""),
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
      routen.forEach(function (r, i) { zeichneVerbindungen(r, r.id === S.auswahl, i); });

      var gruppen = {};
      routen.forEach(function (r) {
        punkte(r, r.id === S.auswahl).forEach(function (p) {
          if (!p.ort || p.ort.lat == null) return;
          var k = p.ort.lat.toFixed(5) + "," + p.ort.lon.toFixed(5);
          (gruppen[k] = gruppen[k] || []).push(p);
        });
      });

      Object.keys(gruppen).forEach(function (k) {
        var g = gruppen[k];
        var teile = k.split(",");
        var pos = [Number(teile[0]), Number(teile[1])];
        g.sort(function (x, y) { return (y.betont ? 1 : 0) - (x.betont ? 1 : 0); });
        var kopfP = g[0];
        var aktivHier = g.some(function (p) {
          return S.aktiv && S.aktiv.id === (p.eintragId || p.id) && S.aktiv.routeId === p.routeId;
        });

        var m;
        if (g.length === 1) {
          // Ziehbar nur im Bearbeitungsmodus, und nur was einen
          // eigenen Ort hat. Kandidaten des offenen Hochzeitsorts
          // bleiben fest, sie gehoeren zwei Alternativen zugleich.
          var ziehbar = S.bearbeiten && kopfP.betont && !kopfP.alternativ && kopfP.ort && kopfP.ort.id;
          m = global.L.marker(pos, {
            icon: symbol(kopfP.markenArt, kopfP.farbe, kopfP.zahl, aktivHier, kopfP.alternativ || kopfP.verwaist),
            keyboard: true, title: kopfP.titel,
            opacity: kopfP.betont ? 1 : 0.45,
            zIndexOffset: kopfP.betont ? 400 : 0,
            draggable: !!ziehbar,
            autoPan: !!ziehbar,
          });
          if (ziehbar) {
            // Die Koordinate wechselt erst beim Loslassen, nicht
            // waehrend des Zuges. So bleibt ein Versehen ein einziger
            // Schritt und laesst sich am Stueck zuruecknehmen.
            m.on("dragend", function (ev2) {
              var ll = ev2.target.getLatLng();
              if (S.werkstatt && S.werkstatt.punktGezogen) {
                S.werkstatt.punktGezogen(kopfP, ll.lat, ll.lng, function () { zeichne(); });
              } else {
                zeichne();
              }
            });
          }
          m.on("click", function () { waehle(kopfP); });
          m.bindPopup(popupEines(kopfP), { className: "reise-popup" });
          marker[kopfP.routeId + "/" + kopfP.id] = m;
        } else {
          m = global.L.marker(pos, {
            icon: symbol("mehrfach", kopfP.farbe, String(g.length), aktivHier),
            keyboard: true, title: g.length + " Einträge an diesem Ort", zIndexOffset: 500,
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
      if (p.alternativ) d.appendChild(el("span", "reise-popup-neben", "Alternative, solange der Hochzeitsort offen ist."));
      if (p.verwaist) d.appendChild(el("span", "reise-popup-neben", "Im aktiven Entwurf gibt es dafür keine Basis."));
      var o = p.ort;
      if (o) {
        d.appendChild(el("span", "reise-popup-quelle",
          (ORTTYP[o.typ] || o.typ) + ", " + (GENAUIGKEIT_ORT[o.genauigkeit] || o.genauigkeit)));
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
      var eintrag = seite.querySelector('[data-eintrag="' + id + '"]');
      if (eintrag) {
        eintrag.scrollIntoView({ block: "nearest" });
        if (eintrag.focus) eintrag.focus({ preventScroll: true });
      }
    }

    /* ------------------------------------------------ Liste zeichnen */

    function zeichneListe() {
      leer(liste);
      liste.hidden = S.tafel !== "plan";
      if (S.tafel !== "plan") return;

      var r = route(S.auswahl);
      var e = entwurf(r);
      var t = tage(e);

      var kopfZeile = el("div", "reise-listenkopf");
      var h = el("h3", null, r.name);
      h.style.setProperty("--farbe", r.farbe);
      kopfZeile.appendChild(h);
      kopfZeile.appendChild(el("p", "reise-summe reise-leise", "Entwurf: " + e.name));

      var ab = t.__naechte - zielNaechte;
      var summeZeile = el("p", "reise-summe" + (ab === 0 ? "" : " ist-konflikt"),
        naechteWort(t.__naechte) + (ab === 0
          ? ", genau das Ziel von " + zielNaechte + ". Ankunft an Tag 1, Rückflug an Tag " + t.__abflug + "."
          : ", " + (ab > 0 ? ab + " zu viel" : -ab + " fehlen") + " gegenüber dem Ziel von " + zielNaechte +
            ". Ungelöster Planungskonflikt, der Entwurf gilt noch nicht als vollständige 21 Tage Variante."));
      kopfZeile.appendChild(summeZeile);

      kopfZeile.appendChild(el("p", "reise-summe reise-leise",
        plan.startdatum
          ? "Startdatum: " + plan.startdatum + ", gerechnet in " + (plan.zeitzone || "Asia/Tokyo") + "."
          : "Kein Startdatum gesetzt. Die Angaben sind relative Reisetage, keine Kalenderdaten."));
      liste.appendChild(kopfZeile);

      liste.appendChild(zeileEreignis(r, r.ankunft, "Tag 1"));

      e.aufenthalte.forEach(function (a, i) {
        var v = e.verbindungen.filter(function (x) { return x.nach.id === a.id; })[0];
        if (v) liste.appendChild(zeileVerbindung(r, e, v));
        // Vor jedem Aufenthalt eine Ablagestelle. Was hier landet, wird
        // eine eigene Uebernachtungsbasis, kein Ziel eines Aufenthalts.
        if (S.bearbeiten && S.werkstatt && S.werkstatt.luecke) liste.appendChild(S.werkstatt.luecke(r, e, i));
        liste.appendChild(zeileAufenthalt(r, e, a, i, t[a.id]));
      });
      if (S.bearbeiten && S.werkstatt && S.werkstatt.luecke) {
        liste.appendChild(S.werkstatt.luecke(r, e, e.aufenthalte.length));
      }

      liste.appendChild(zeileEreignis(r, r.abflug, "Tag " + t.__abflug));

      // Vorschlaege ohne Basis im aktiven Entwurf. Sie werden markiert,
      // nicht geloescht und nicht heimlich woanders eingehaengt.
      var verwaist = sichtbareBesuche(r).filter(function (b) { return !basisFuer(b, e); });
      if (verwaist.length) {
        var block = el("div", "reise-verwaist");
        block.appendChild(el("h4", null, "Ohne Basis in diesem Entwurf"));
        block.appendChild(el("p", "reise-leise",
          "Diese Vorschläge gehören zu einem Ort, an dem dieser Entwurf nicht übernachtet. Sie bleiben erhalten und warten auf eine neue Zuordnung."));
        var ul = el("ul", "reise-vorschlaege");
        verwaist.forEach(function (b) { ul.appendChild(zeileBesuch(r, e, b, true)); });
        block.appendChild(ul);
        liste.appendChild(block);
      }
    }

    function zeileEreignis(r, ev, tagText) {
      var d = el("div", "reise-zeile reise-ereignis");
      d.tabIndex = 0;
      d.dataset.eintrag = ev.id;
      var k = el("div", "reise-zeile-kopf");
      k.appendChild(el("span", "reise-zeile-titel", ev.art === "ankunft" ? "Ankunft in Tokio" : "Rückflug ab Tokio"));
      k.appendChild(el("span", "reise-zeile-neben", tagText));
      d.appendChild(k);
      d.appendChild(el("p", "reise-zeile-text", ev.text));
      if (ev.flughafenOffen && ev.flughafenOffen.length) {
        d.appendChild(el("p", "reise-marke-offen", "Flughafen noch offen: " +
          ev.flughafenOffen.map(function (id) { return ort(id).name; }).join(" oder ")));
      }
      d.addEventListener("click", function () { waehle({ art: "ereignis", id: ev.id, routeId: r.id }); });
      d.addEventListener("keydown", function (e2) {
        if (e2.key === "Enter" || e2.key === " ") { e2.preventDefault(); d.click(); }
      });
      return d;
    }

    function zeileVerbindung(r, e, v) {
      var g = genauigkeit(r, e, v);
      var d = el("div", "reise-verbindung reise-genau-" + g);
      var k = el("div", "reise-zeile-kopf");
      k.appendChild(el("span", "reise-zeile-titel", mittelListe(v)));
      k.appendChild(el("span", "reise-marke-genau", GENAU[g]));
      d.appendChild(k);

      if (v.abschnitte.length > 1) {
        var ul = el("ul", "reise-abschnitte");
        v.abschnitte.forEach(function (s) {
          var vo = ort(s.vonOrt), na = ort(s.nachOrt);
          ul.appendChild(el("li", null,
            (MITTEL[s.mittel] || s.mittel) + ": " + (vo ? vo.name : "offen") + " nach " + (na ? na.name : "offen")));
        });
        d.appendChild(ul);
      }

      var hinweise = v.abschnitte.map(function (s) { return s.hinweis; }).filter(Boolean);
      d.appendChild(el("p", "reise-zeile-text reise-leise",
        (v.hinweis ? v.hinweis + " " : "") + (hinweise.length ? hinweise.join(" ") + " " : "") +
        GENAU_ERKLAERT[g] +
        (v.dauerMin == null && v.distanzKm == null ? " Fahrzeit und Entfernung sind unbekannt." : "")));
      return d;
    }

    function zeileAufenthalt(r, e, a, i, spanne) {
      var offen = istOffen(a);
      var d = el("div", "reise-zeile reise-aufenthalt" + (offen ? " ist-offen" : ""));
      d.tabIndex = 0;
      d.dataset.eintrag = a.id;
      d.dataset.ablage = "aufenthalt";
      d.dataset.aufenthalt = a.id;
      d.dataset.route = r.id;
      if (S.aktiv && S.aktiv.id === a.id) d.classList.add("ist-aktiv");
      d.style.setProperty("--farbe", r.farbe);

      var k = el("div", "reise-zeile-kopf");
      var num = el("span", "reise-nummer", String(i + 1));
      num.setAttribute("aria-hidden", "true");
      k.appendChild(num);
      k.appendChild(el("span", "reise-zeile-titel", nameDesHalts(a)));
      k.appendChild(el("span", "reise-zeile-neben",
        "Tag " + spanne.an + " bis " + spanne.weiter + ", " + naechteWort(a.naechte)));
      d.appendChild(k);

      if (offen && a.ortOffen) {
        d.appendChild(el("p", "reise-marke-offen", "Ort noch offen: " +
          (a.ortOffen.kandidaten || []).map(function (id) { return ort(id).name; }).join(" oder ")));
      }
      if (a.notizen) d.appendChild(el("p", "reise-zeile-text", a.notizen));

      // Unterkunft, ohne erfundenes Haus und ohne erfundenen Preis.
      var u = plan.unterkuenfte && plan.unterkuenfte[a.id];
      if (u) {
        var uz = el("p", "reise-unterkunft");
        uz.appendChild(el("strong", null, "Unterkunft: "));
        uz.appendChild(document.createTextNode(
          (u.hotel || u.status) + ". " + u.zimmerbedarf + ". Zugang " + u.zugang + "."));
        d.appendChild(uz);
      }

      var besuche = sichtbareBesuche(r).filter(function (b) {
        var basis = basisFuer(b, e);
        return basis && basis.id === a.id && passtFilter(b);
      });
      if (besuche.length) {
        var ul = el("ul", "reise-vorschlaege");
        besuche.forEach(function (b) { ul.appendChild(zeileBesuch(r, e, b, false)); });
        d.appendChild(ul);
      }

      if (S.bearbeiten && S.werkstatt && S.werkstatt.haltWerkzeug) {
        d.appendChild(S.werkstatt.haltWerkzeug(r, e, a, i));
      }

      d.addEventListener("click", function (ev2) {
        if (ev2.target.closest("a") || ev2.target.closest("button") || ev2.target.closest("select")) return;
        waehle({ art: "aufenthalt", id: a.id, routeId: r.id });
      });
      d.addEventListener("keydown", function (ev2) {
        if (ev2.target !== d) return;
        if (ev2.key === "Enter" || ev2.key === " ") { ev2.preventDefault(); d.click(); }
      });
      return d;
    }

    function zeileBesuch(r, e, b, verwaist) {
      var o = ort(b.ortId);
      var li = el("li", "reise-vorschlag" + (o ? "" : " ist-offen") + (verwaist ? " ist-verwaist" : ""));
      li.dataset.eintrag = b.id;
      li.tabIndex = 0;
      if (S.aktiv && S.aktiv.id === b.id) li.classList.add("ist-aktiv");

      var k = el("div", "reise-zeile-kopf");
      k.appendChild(el("span", "reise-zeile-titel", b.name));
      k.appendChild(el("span", "reise-zeile-neben", FORMEN[b.form] || b.form));
      li.appendChild(k);

      if (b.interesse) li.appendChild(el("p", "reise-zeile-text", b.interesse));

      var marken = el("p", "reise-marken");
      (b.kategorien || []).forEach(function (kat) {
        marken.appendChild(el("span", "reise-chip", KATEGORIEN[kat] || kat));
      });
      if (b.region) marken.appendChild(el("span", "reise-chip", REGIONEN[b.region] || b.region));
      li.appendChild(marken);

      if (verwaist) {
        li.appendChild(el("p", "reise-marke-offen", "Zur Neuplanung markiert: " +
          (b.basis || []).map(function (id) { return (ort(id) || {}).name || id; }).join(" oder ") +
          " ist in diesem Entwurf keine Basis."));
      }

      if (!o) li.appendChild(el("p", "reise-marke-offen", "Ort auf Karte festlegen"));
      else if (o.genauigkeit !== "bestaetigt") {
        li.appendChild(el("p", "reise-leise reise-zeile-text",
          GENAUIGKEIT_ORT[o.genauigkeit] + (o.anker ? ": " + o.anker : "")));
      }

      if (b.notizen) li.appendChild(el("p", "reise-zeile-text", b.notizen));

      var m = b.mobilitaet || {};
      var w = el("p", "reise-mobil");
      w.appendChild(el("strong", null, "Zum Gehen: "));
      w.appendChild(document.createTextNode(m.hinweis || "noch nicht geprüft. Eine fehlende Angabe ist kein Beleg für einen leichten Weg."));
      li.appendChild(w);

      var href = sichererLink(b.quelleLink);
      if (href) {
        var a2 = el("a", "reise-quelle", "Quelle");
        a2.href = href;
        a2.target = "_blank";
        a2.rel = "noopener noreferrer";
        li.appendChild(a2);
      }

      li.dataset.besuch = b.id;
      li.dataset.route = r.id;
      if (S.bearbeiten && S.werkstatt && S.werkstatt.besuchWerkzeug) {
        li.appendChild(S.werkstatt.besuchWerkzeug(r, e, b));
      }

      li.addEventListener("click", function (ev2) {
        if (ev2.target.closest("a") || ev2.target.closest("button") || ev2.target.closest("select")) return;
        ev2.stopPropagation();
        waehle({ art: "besuch", id: b.id, routeId: r.id });
      });
      li.addEventListener("keydown", function (ev2) {
        if (ev2.target !== li) return;
        if (ev2.key === "Enter" || ev2.key === " ") { ev2.preventDefault(); li.click(); }
      });
      return li;
    }

    /* ------------------------------------------------ Weitere Ideen */

    function filterZeile(titel, quelle, zustand, beschriftung) {
      var feld = el("div", "reise-feld");
      feld.appendChild(el("h3", null, titel));
      var gruppe = el("div", "reise-schalter");
      Object.keys(quelle).forEach(function (k) {
        var b = el("button", "reise-wahl", beschriftung ? beschriftung(k) : quelle[k]);
        b.type = "button";
        b.setAttribute("aria-pressed", zustand[k] ? "true" : "false");
        if (zustand[k]) b.classList.add("ist-aktiv");
        b.addEventListener("click", function () { zustand[k] = !zustand[k]; zeichne(); });
        gruppe.appendChild(b);
      });
      feld.appendChild(gruppe);
      return feld;
    }

    function zeichneIdeen() {
      leer(ideen);
      ideen.hidden = S.tafel !== "ideen";
      if (S.tafel !== "ideen") return;

      var r = route(S.auswahl);
      var e = entwurf(r);

      ideen.appendChild(filterZeile("Region", REGIONEN, S.filterRegion));
      ideen.appendChild(filterZeile("Interesse", KATEGORIEN, S.filterKat));
      ideen.appendChild(filterZeile("Besuchsform", FORMEN, S.filterForm));

      var alle = sichtbareBesuche(r).filter(passtFilter);
      ideen.appendChild(el("p", "reise-summe reise-leise",
        alle.length + " von " + sichtbareBesuche(r).length + " Vorschlägen. Alle sind optional und noch keinem Ausflugstag zugeordnet."));

      var ul = el("ul", "reise-vorschlaege");
      alle.forEach(function (b) {
        var basis = basisFuer(b, e);
        var li = zeileBesuch(r, e, b, !basis);
        var wo = el("p", "reise-leise reise-zeile-text");
        if (basis) {
          wo.textContent = "Von " + nameDesHalts(basis) + " aus. Als Übernachtung geplant würde daraus eine eigene Basis, deren Nächte von einem anderen Aufenthalt kommen müssten.";
        } else {
          wo.textContent = "In diesem Entwurf ohne Basis. Eine Übernachtung hier würde einen neuen Aufenthalt erzeugen und Nächte an anderer Stelle kosten.";
        }
        li.appendChild(wo);
        ul.appendChild(li);
      });
      ideen.appendChild(ul);

      ideen.appendChild(el("p", "reise-leise",
        "Einplanen mit Übernachtung, Vorschau und Rückgängig kommen im nächsten Schritt. Bisher lässt sich hier ansehen und vergleichen."));
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
        ["aufenthalt", "Übernachtungsbasis, mit ihrer Nummer"],
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
      var li3 = el("li");
      var s3 = el("span", "reise-marke reise-marke-sicht ist-alternativ");
      s3.setAttribute("aria-hidden", "true");
      s3.appendChild(el("span", "reise-raute"));
      li3.appendChild(s3);
      li3.appendChild(document.createTextNode("Gestrichelt umrandet: Alternative oder ohne Basis im aktiven Entwurf"));
      ul2.appendChild(li3);
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
        li.appendChild(el("span", "reise-strich reise-strich-" + paar[0]));
        li.appendChild(document.createTextNode(paar[1]));
        ul3.appendChild(li);
      });
      g3.appendChild(ul3);
      legende.appendChild(g3);

      legende.appendChild(el("p", "reise-leise",
        "Die Farbe steht für den Reisevorschlag, das Muster für Verkehrsmittel und Genauigkeit. " +
        "Kartendaten von " + anbieter.name + ", die Quellenangabe steht in der Karte. " +
        "Nichts hier ist gebucht oder reserviert."));
    }

    /* --------------------------------------------------- Ausschnitt */

    function grenzen(routen) {
      var raus = [];
      routen.forEach(function (r) {
        punkte(r, true).forEach(function (p) {
          if (p.ort && p.ort.lat != null) raus.push([p.ort.lat, p.ort.lon]);
        });
      });
      return raus;
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

    // Okinawa muss hineinpassen, deshalb reicht der Ausschnitt von
    // Okinawa im Suedwesten bis Hokkaido im Nordosten.
    function ganzJapan() {
      if (!karte) return;
      karte.fitBounds(global.L.latLngBounds([[24.0, 122.5], [45.7, 146.0]]), { animate: true });
    }

    /* --------------------------------------------------- Neuzeichnen */

    function zeichneEntwuerfe() {
      var r = route(S.auswahl);
      leer(entwurfGruppe);
      r.entwuerfe.forEach(function (e) {
        var b = el("button", "reise-wahl", e.name);
        b.type = "button";
        b.setAttribute("role", "radio");
        var an = e.id === r.aktiverEntwurf;
        b.setAttribute("aria-checked", an ? "true" : "false");
        if (an) b.classList.add("ist-aktiv");
        b.addEventListener("click", function () {
          r.aktiverEntwurf = e.id;
          S.aktiv = null;
          zeichne();
          aufRoute(r, true);
        });
        entwurfGruppe.appendChild(b);
      });
      var e = entwurf(r);
      leer(entwurfText);
      entwurfText.appendChild(document.createTextNode(e.beschreibung + " "));
      var href = sichererLink(e.quelle);
      if (href) {
        var a = el("a", "reise-quelle", "Quelle");
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
        entwurfText.appendChild(a);
      }
      entwurfText.appendChild(el("span", "reise-leise",
        " Die Verteilung der Nächte ist ein Planungsvorschlag. Nur der gewählte Entwurf zählt, es laufen nie zwei gleichzeitig."));
    }

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

      Object.keys(tafelKnoepfe).forEach(function (k) {
        var an = S.tafel === k;
        tafelKnoepfe[k].classList.toggle("ist-aktiv", an);
        tafelKnoepfe[k].setAttribute("aria-selected", an ? "true" : "false");
      });

      zeichneEntwuerfe();
      if (S.werkstatt && S.werkstatt.vorZeichnen) S.werkstatt.vorZeichnen();
      zeichneListe();
      zeichneIdeen();
      zeichneKarte();
      zeichneLegende();
      if (S.werkstatt && S.werkstatt.nachZeichnen) S.werkstatt.nachZeichnen();
    }

    starteKarte();
    zeichne();
    if (karte) setTimeout(function () { karte.invalidateSize(); aufRoute(route(S.auswahl), false); }, 80);

    // Alles, was die Werkstatt braucht, an einer Stelle. Sie kennt
    // damit die Daten, aber nicht die inneren Bausteine der Ansicht.
    var schnittstelle = {
      wurzel: wurzel,
      plan: plan,
      zustand: S,
      zeichne: zeichne,
      modus: modus,
      karte: function () { return karte; },
      hilfen: {
        ort: ort,
        route: route,
        entwurf: entwurf,
        tage: tage,
        basisFuer: basisFuer,
        ortDesHalts: ortDesHalts,
        nameDesHalts: nameDesHalts,
        sichtbareBesuche: sichtbareBesuche,
        el: el,
        leer: leer,
        sichererLink: sichererLink,
        naechteWort: naechteWort,
        KATEGORIEN: KATEGORIEN,
        REGIONEN: REGIONEN,
        FORMEN: FORMEN,
      },
      // Stellen, an denen die Werkstatt eigene Teile einhaengt.
      stellen: { kopf: kopf, seite: seite, liste: liste, ideen: ideen },
    };

    if (typeof einst.werkstatt === "function" && einst.sofortBearbeiten) modus(true);

    return schnittstelle;
  }

  global.reiseplaner = planer;
})(window);
