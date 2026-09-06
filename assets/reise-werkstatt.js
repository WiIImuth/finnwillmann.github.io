/* ------------------------------------------------------------------
   Werkstatt: der Bearbeitungsteil des Reiseplaners.

   Wird erst geladen, wenn wirklich bearbeitet wird. Sie kennt die
   Daten ueber die Schnittstelle des Planers, nicht seine inneren
   Bausteine.

   Bausteine ziehen, Ziele umhaengen, ins Zwischenlager legen und
   zurueckholen, Punkte auf der Karte verschieben, alles rueckgaengig
   machen und den Entwurf im Browser sichern.

   Zwei Grundsaetze ziehen sich durch:

   1. Nichts wird geloescht. Was aus der Route fliegt, landet im
      Zwischenlager und behaelt alle seine Daten.
   2. Kein erfundener Ort. Ein neuer Baustein bekommt einen
      vorlaeufigen Punkt neben seiner Basis, ausdruecklich als
      ungesetzt gekennzeichnet, bis jemand ihn zieht.

   Gezogen wird mit Zeigerereignissen, damit es auch mit dem Finger
   geht. Zu jedem Zug gibt es gleichwertige Schaltflaechen, damit die
   Tastatur nichts verpasst.
------------------------------------------------------------------ */

(function (global) {
  "use strict";

  var DB_NAME = "reiseplaner";
  var DB_LADEN = 1;
  var SCHRITTE_MAX = 40;

  /* --------------------------------------------------- Browserablage */

  // IndexedDB statt localStorage: der Plan ist gross und waechst, und
  // localStorage haette weder Platz noch eine ehrliche Fehlermeldung.
  function db() {
    return new Promise(function (ja, nein) {
      if (!global.indexedDB) return nein(new Error("keine Browserdatenbank"));
      var anfrage = global.indexedDB.open(DB_NAME, DB_LADEN);
      anfrage.onupgradeneeded = function () {
        var d = anfrage.result;
        if (!d.objectStoreNames.contains("entwuerfe")) d.createObjectStore("entwuerfe", { keyPath: "id" });
      };
      anfrage.onsuccess = function () { ja(anfrage.result); };
      anfrage.onerror = function () { nein(anfrage.error || new Error("Datenbank nicht erreichbar")); };
    });
  }

  function ablegen(satz) {
    return db().then(function (d) {
      return new Promise(function (ja, nein) {
        var t = d.transaction("entwuerfe", "readwrite");
        t.objectStore("entwuerfe").put(satz);
        t.oncomplete = function () { d.close(); ja(); };
        t.onerror = function () { d.close(); nein(t.error); };
      });
    });
  }

  function holen(id) {
    return db().then(function (d) {
      return new Promise(function (ja, nein) {
        var t = d.transaction("entwuerfe", "readonly");
        var a = t.objectStore("entwuerfe").get(id);
        a.onsuccess = function () { d.close(); ja(a.result || null); };
        a.onerror = function () { d.close(); nein(a.error); };
      });
    });
  }

  /* ------------------------------------------------------- Werkstatt */

  function werkstatt(P) {
    var el = P.hilfen.el;
    var leer = P.hilfen.leer;
    var KATEGORIEN = P.hilfen.KATEGORIEN;
    var FORMEN = P.hilfen.FORMEN;
    var plan = P.plan;

    plan.zwischenlager = plan.zwischenlager || [];

    var W = {
      verlauf: [],
      zukunft: [],
      standTitel: "",
      speicher: "bereit",
      speicherUhr: null,
      zaehler: 0,
      zieht: null,
    };

    var basisRevision = plan.revision || 0;

    /* ------------------------------------------------ Kleinigkeiten */

    function neueId(p) {
      W.zaehler++;
      return p + "-" + Date.now().toString(36) + "-" + W.zaehler.toString(36);
    }

    function abbild() { return JSON.stringify(plan); }

    function einsetzen(text) {
      var neu = JSON.parse(text);
      Object.keys(plan).forEach(function (k) { delete plan[k]; });
      Object.keys(neu).forEach(function (k) { plan[k] = neu[k]; });
      plan.zwischenlager = plan.zwischenlager || [];
    }

    // Vor jeder Aenderung ein Abbild. Ein Schritt ist eine
    // Nutzerhandlung, nicht ein einzelnes Feld.
    function schritt(titel, tun) {
      var vorher = abbild();
      tun();
      W.verlauf.push({ titel: titel, stand: vorher });
      if (W.verlauf.length > SCHRITTE_MAX) W.verlauf.shift();
      W.zukunft.length = 0;
      W.standTitel = titel;
      sichern();
      P.zeichne();
    }

    function zurueck() {
      if (!W.verlauf.length) return;
      var s = W.verlauf.pop();
      W.zukunft.push({ titel: s.titel, stand: abbild() });
      einsetzen(s.stand);
      W.standTitel = "Zurückgenommen: " + s.titel;
      sichern();
      P.zeichne();
    }

    function vor() {
      if (!W.zukunft.length) return;
      var s = W.zukunft.pop();
      W.verlauf.push({ titel: s.titel, stand: abbild() });
      einsetzen(s.stand);
      W.standTitel = "Wiederholt: " + s.titel;
      sichern();
      P.zeichne();
    }

    /* ---------------------------------------------------- Speichern */

    function sichern() {
      W.speicher = "speichert";
      zeigeStand();
      if (W.speicherUhr) clearTimeout(W.speicherUhr);
      W.speicherUhr = setTimeout(function () {
        ablegen({ id: "entwurf", plan: JSON.parse(abbild()), basisRevision: basisRevision, zeit: Date.now() })
          .then(function () { W.speicher = "gespeichert"; zeigeStand(); })
          .catch(function () { W.speicher = "fehler"; zeigeStand(); });
      }, 500);
    }

    var standAnzeige = null;
    function zeigeStand() {
      if (!standAnzeige) return;
      var text = W.speicher === "speichert" ? "Wird gespeichert …"
        : W.speicher === "gespeichert" ? "Gespeichert im Browser"
        : W.speicher === "fehler" ? "Speichern fehlgeschlagen"
        : "Noch nichts geändert";
      standAnzeige.textContent = text + (W.standTitel ? " · " + W.standTitel : "");
      standAnzeige.dataset.stand = W.speicher;
    }

    /* ------------------------------------------------ Orte anlegen - */

    // Ein neuer Baustein bekommt einen vorlaeufigen Punkt neben seiner
    // Basis, damit er ueberhaupt auf der Karte auftaucht. Er ist
    // ausdruecklich als ungesetzt markiert und traegt keine Quelle.
    // Erst das Ziehen macht daraus einen echten Punkt.
    function vorlaeufigerOrt(name, basisOrt, nummer) {
      var id = neueId("ort-eigen");
      var winkel = (nummer % 8) * (Math.PI / 4);
      var weite = 0.02 + Math.floor(nummer / 8) * 0.015;
      plan.orte[id] = {
        id: id,
        name: name,
        lat: basisOrt ? Number((basisOrt.lat + Math.sin(winkel) * weite).toFixed(6)) : null,
        lon: basisOrt ? Number((basisOrt.lon + Math.cos(winkel) * weite).toFixed(6)) : null,
        typ: "sicht",
        genauigkeit: "vorlaeufig",
        quelle: basisOrt ? "Vorläufig neben der Basis gesetzt, noch nicht bestätigt" : null,
        vomNutzer: true,
      };
      return id;
    }

    function neuerBesuch(r, aufenthalt, daten, nummer) {
      var basisOrt = aufenthalt ? P.hilfen.ortDesHalts(aufenthalt) : null;
      var ortId = vorlaeufigerOrt(daten.name, basisOrt, nummer);
      return {
        id: neueId("b"),
        extId: "eigen:" + neueId("x"),
        ortId: ortId,
        name: daten.name,
        basis: basisOrt ? [basisOrt.id] : [],
        form: daten.form || "local",
        region: daten.region || (basisOrt && basisOrt.region) || "",
        kategorien: daten.kategorien || [],
        interesse: daten.beschreibung || "",
        quelleLink: "",
        mobilitaet: {
          treppen: "unbekannt", steigung: "unbekannt", untergrund: "unbekannt",
          sitzen: "unbekannt", vomAusstieg: "unbekannt", taxi: "unbekannt",
          gehstrecke: "unbekannt", hinweis: "", quelle: "",
        },
        notizen: "",
        status: "eingeplant",
        ausgeblendet: false,
        tag: null,
        reihenfolge: null,
        eigen: true,
      };
    }

    /* -------------------------------------------- Handlungen -------- */

    function insLager(r, b, grund) {
      schritt("„" + b.name + "“ ins Zwischenlager", function () {
        r.besuche = r.besuche.filter(function (x) { return x.id !== b.id; });
        plan.zwischenlager.push({
          id: neueId("z"),
          herkunftRoute: r.id,
          herkunftName: r.name,
          grund: grund || "von Hand herausgenommen",
          zeit: Date.now(),
          besuch: JSON.parse(JSON.stringify(b)),
        });
      });
    }

    function ausLager(eintrag, zielRoute, zielHalt) {
      schritt("„" + eintrag.besuch.name + "“ nach " + P.hilfen.nameDesHalts(zielHalt), function () {
        plan.zwischenlager = plan.zwischenlager.filter(function (x) { return x.id !== eintrag.id; });
        var b = JSON.parse(JSON.stringify(eintrag.besuch));
        var o = P.hilfen.ortDesHalts(zielHalt);
        // Der Ort bleibt derselbe, nur die Basis wechselt. Notizen und
        // Planungsstand gehoeren der Route, nicht dem Ort.
        b.id = neueId("b");
        b.basis = o ? [o.id] : [];
        if (zielRoute.besuche.some(function (x) { return x.extId === b.extId; })) {
          b.extId = "eigen:" + neueId("x");
        }
        zielRoute.besuche.push(b);
      });
    }

    function umhaengen(r, b, zielHalt) {
      var o = P.hilfen.ortDesHalts(zielHalt);
      if (!o) return;
      schritt("„" + b.name + "“ zu " + o.name, function () {
        b.basis = [o.id];
        b.basisVomNutzer = true;
      });
    }

    /* ------------------------------- Punkt auf der Karte verschoben - */

    function punktGezogen(p, lat, lon, fertig) {
      var o = p.ort;
      if (!o) return fertig();
      var geteilt = zaehleNutzer(o.id);
      if (geteilt.routen.length > 1) {
        frageGeteilt(o, geteilt, lat, lon, fertig);
        return;
      }
      schritt("„" + o.name + "“ verschoben", function () { setzeOrt(o.id, lat, lon); });
      fertig();
    }

    function setzeOrt(id, lat, lon) {
      var o = plan.orte[id];
      o.lat = Number(lat.toFixed(6));
      o.lon = Number(lon.toFixed(6));
      o.genauigkeit = "gesetzt";
      o.quelle = "Auf der Karte gesetzt am " + new Date().toLocaleDateString("de-DE");
      o.vomNutzer = true;
    }

    // Wer benutzt diesen Ort? Erst danach laesst sich sagen, ob ein Zug
    // nur hier oder ueberall wirkt.
    function zaehleNutzer(ortId) {
      var routen = [], stellen = 0;
      plan.routen.forEach(function (r) {
        var drin = false;
        r.entwuerfe.forEach(function (e) {
          e.aufenthalte.forEach(function (a) { if (a.ortId === ortId) { drin = true; stellen++; } });
        });
        r.besuche.forEach(function (b) { if (b.ortId === ortId) { drin = true; stellen++; } });
        if (drin) routen.push(r);
      });
      return { routen: routen, stellen: stellen };
    }

    function frageGeteilt(o, geteilt, lat, lon, fertig) {
      var kasten = el("div", "reise-frage");
      kasten.setAttribute("role", "dialog");
      kasten.setAttribute("aria-modal", "true");
      var k = el("div", "reise-frage-kasten");
      k.appendChild(el("h4", null, "„" + o.name + "“ wird von mehreren Routen benutzt"));
      k.appendChild(el("p", null,
        "Dieser Ort steckt in " + geteilt.routen.length + " Routen: " +
        geteilt.routen.map(function (r) { return r.name; }).join(", ") +
        ". Soll die neue Lage überall gelten oder nur hier?"));
      var reihe = el("div", "btn-row");

      var nurHier = el("button", "btn", "Nur für diese Route");
      nurHier.type = "button";
      nurHier.addEventListener("click", function () {
        var r = P.hilfen.route(P.zustand.auswahl);
        schritt("„" + o.name + "“ nur in " + r.name + " verschoben", function () {
          // Eine eigene Fassung des Ortes, damit die anderen Routen
          // unberuehrt bleiben.
          var neuId = neueId("ort-eigen");
          plan.orte[neuId] = JSON.parse(JSON.stringify(o));
          plan.orte[neuId].id = neuId;
          plan.orte[neuId].abgeleitetVon = o.id;
          setzeOrt(neuId, lat, lon);
          r.besuche.forEach(function (b) { if (b.ortId === o.id) b.ortId = neuId; });
          r.entwuerfe.forEach(function (e) {
            e.aufenthalte.forEach(function (a) { if (a.ortId === o.id) a.ortId = neuId; });
          });
        });
        schliessen();
      });

      var ueberall = el("button", "btn btn-primary", "In allen Routen");
      ueberall.type = "button";
      ueberall.addEventListener("click", function () {
        schritt("„" + o.name + "“ überall verschoben", function () { setzeOrt(o.id, lat, lon); });
        schliessen();
      });

      var zurueckKnopf = el("button", "btn", "Doch nicht");
      zurueckKnopf.type = "button";
      zurueckKnopf.addEventListener("click", function () { schliessen(); });

      reihe.appendChild(ueberall);
      reihe.appendChild(nurHier);
      reihe.appendChild(zurueckKnopf);
      k.appendChild(reihe);
      kasten.appendChild(k);
      document.body.appendChild(kasten);
      ueberall.focus();

      function schliessen() {
        kasten.remove();
        fertig();
      }
    }

    /* ------------------------------------------- Baustein anlegen -- */

    function frageBaustein(kategorie, beimAnlegen) {
      var kasten = el("div", "reise-frage");
      kasten.setAttribute("role", "dialog");
      kasten.setAttribute("aria-modal", "true");
      var k = el("div", "reise-frage-kasten");
      k.appendChild(el("h4", null, "Neuer Baustein: " + (KATEGORIEN[kategorie] || kategorie)));

      var f = el("form", "reise-formular");

      var l1 = el("label", null, "Name");
      l1.htmlFor = "baustein-name";
      var i1 = el("input");
      i1.id = "baustein-name";
      i1.required = true;
      i1.maxLength = 120;
      f.appendChild(l1); f.appendChild(i1);

      var l2 = el("label", null, "Beschreibung");
      l2.htmlFor = "baustein-text";
      var i2 = el("textarea");
      i2.id = "baustein-text";
      i2.rows = 3;
      i2.maxLength = 600;
      f.appendChild(l2); f.appendChild(i2);

      var l3 = el("label", null, "Besuchsform");
      l3.htmlFor = "baustein-form";
      var i3 = el("select");
      i3.id = "baustein-form";
      Object.keys(FORMEN).forEach(function (key) {
        var o = el("option", null, FORMEN[key]);
        o.value = key;
        i3.appendChild(o);
      });
      f.appendChild(l3); f.appendChild(i3);

      f.appendChild(el("p", "reise-leise",
        "Der Punkt erscheint vorläufig neben seiner Basis und ist als ungesetzt gekennzeichnet. " +
        "Zieh ihn auf der Karte an die richtige Stelle."));

      var reihe = el("div", "btn-row");
      var ok = el("button", "btn btn-primary", "Anlegen");
      ok.type = "submit";
      var weg = el("button", "btn", "Abbrechen");
      weg.type = "button";
      weg.addEventListener("click", function () { kasten.remove(); });
      reihe.appendChild(ok); reihe.appendChild(weg);
      f.appendChild(reihe);

      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var name = i1.value.trim();
        if (!name) { i1.focus(); return; }
        kasten.remove();
        beimAnlegen({
          name: name,
          beschreibung: i2.value.trim(),
          form: i3.value,
          kategorien: [kategorie],
        });
      });

      k.appendChild(f);
      kasten.appendChild(k);
      document.body.appendChild(kasten);
      i1.focus();
    }

    /* ------------------------------------------------------- Ziehen */

    // Eigenes Ziehen mit Zeigerereignissen. Die eingebaute Technik des
    // Browsers kennt keine Finger, deshalb hier von Hand.
    function ziehbarMachen(griff, nutzlast) {
      griff.style.touchAction = "none";
      griff.addEventListener("pointerdown", function (ev) {
        if (ev.button !== undefined && ev.button !== 0) return;
        ev.preventDefault();
        griff.setPointerCapture(ev.pointerId);

        var geist = el("div", "reise-geist", nutzlast.titel);
        document.body.appendChild(geist);
        W.zieht = { nutzlast: nutzlast, geist: geist, ziel: null };
        bewege(ev);

        function bewege(e2) {
          geist.style.left = e2.clientX + 12 + "px";
          geist.style.top = e2.clientY + 12 + "px";
          var unten = document.elementFromPoint(e2.clientX, e2.clientY);
          var ziel = unten && unten.closest("[data-ablage]");
          if (ziel !== W.zieht.ziel) {
            if (W.zieht.ziel) W.zieht.ziel.classList.remove("ist-ziel");
            W.zieht.ziel = ziel;
            if (ziel) ziel.classList.add("ist-ziel");
          }
        }

        function los(e2) {
          griff.removeEventListener("pointermove", bewege);
          griff.removeEventListener("pointerup", los);
          griff.removeEventListener("pointercancel", ende);
          geist.remove();
          var ziel = W.zieht && W.zieht.ziel;
          if (ziel) ziel.classList.remove("ist-ziel");
          W.zieht = null;
          if (ziel) abgelegt(nutzlast, ziel);
        }

        function ende() {
          griff.removeEventListener("pointermove", bewege);
          griff.removeEventListener("pointerup", los);
          griff.removeEventListener("pointercancel", ende);
          geist.remove();
          if (W.zieht && W.zieht.ziel) W.zieht.ziel.classList.remove("ist-ziel");
          W.zieht = null;
        }

        griff.addEventListener("pointermove", bewege);
        griff.addEventListener("pointerup", los);
        griff.addEventListener("pointercancel", ende);
      });
    }

    function abgelegt(nutzlast, ziel) {
      var art = ziel.dataset.ablage;
      var r = P.hilfen.route(P.zustand.auswahl);
      var e = P.hilfen.entwurf(r);

      if (art === "lager") {
        if (nutzlast.art === "besuch") {
          var b = r.besuche.filter(function (x) { return x.id === nutzlast.id; })[0];
          if (b) insLager(r, b);
        }
        return;
      }

      if (art === "aufenthalt") {
        var halt = e.aufenthalte.filter(function (a) { return a.id === ziel.dataset.aufenthalt; })[0];
        if (!halt) return;

        if (nutzlast.art === "baustein") {
          frageBaustein(nutzlast.kategorie, function (daten) {
            schritt("„" + daten.name + "“ bei " + P.hilfen.nameDesHalts(halt) + " angelegt", function () {
              r.besuche.push(neuerBesuch(r, halt, daten, r.besuche.length));
            });
          });
          return;
        }
        if (nutzlast.art === "besuch") {
          var b2 = r.besuche.filter(function (x) { return x.id === nutzlast.id; })[0];
          if (b2) umhaengen(r, b2, halt);
          return;
        }
        if (nutzlast.art === "lagereintrag") {
          var eintrag = plan.zwischenlager.filter(function (x) { return x.id === nutzlast.id; })[0];
          if (eintrag) ausLager(eintrag, r, halt);
          return;
        }
      }

      if (art === "luecke") {
        hinweisEinmal(
          "Eine eigene Übernachtungsbasis anzulegen verschiebt Nächte und braucht eine Vorschau. " +
          "Das kommt im nächsten Schritt. Bis dahin lassen sich Ziele an bestehende Aufenthalte hängen."
        );
      }
    }

    var hinweisKasten = null;
    function hinweisEinmal(text) {
      if (hinweisKasten) hinweisKasten.remove();
      hinweisKasten = el("div", "reise-blase", text);
      document.body.appendChild(hinweisKasten);
      setTimeout(function () {
        if (hinweisKasten) { hinweisKasten.remove(); hinweisKasten = null; }
      }, 6000);
    }

    /* ------------------------------------------------ Teile zeichnen */

    var leiste = null, palette = null, lager = null;

    function bauLeiste() {
      leiste = el("div", "reise-leiste");

      var links = el("div", "reise-leiste-links");
      var zurueckKnopf = el("button", "btn reise-klein", "Rückgängig");
      zurueckKnopf.type = "button";
      zurueckKnopf.addEventListener("click", zurueck);
      var vorKnopf = el("button", "btn reise-klein", "Wiederholen");
      vorKnopf.type = "button";
      vorKnopf.addEventListener("click", vor);
      links.appendChild(zurueckKnopf);
      links.appendChild(vorKnopf);

      var aus = el("button", "btn reise-klein", "Sichern als Datei");
      aus.type = "button";
      aus.addEventListener("click", ausgeben);
      links.appendChild(aus);

      var ein = el("button", "btn reise-klein", "Datei laden");
      ein.type = "button";
      ein.addEventListener("click", einlesen);
      links.appendChild(ein);

      leiste.appendChild(links);

      standAnzeige = el("p", "reise-stand");
      standAnzeige.setAttribute("role", "status");
      standAnzeige.setAttribute("aria-live", "polite");
      leiste.appendChild(standAnzeige);

      var verlaufFeld = el("details", "reise-verlauf");
      verlaufFeld.appendChild(el("summary", null, "Letzte Schritte"));
      var ul = el("ul");
      verlaufFeld.appendChild(ul);
      leiste.appendChild(verlaufFeld);
      leiste._verlaufListe = ul;
      leiste._zurueck = zurueckKnopf;
      leiste._vor = vorKnopf;
      return leiste;
    }

    function bauPalette() {
      palette = el("div", "reise-feld reise-palette");
      palette.appendChild(el("h3", null, "Bausteine"));
      palette.appendChild(el("p", "reise-leise",
        "Zieh einen Baustein auf einen Aufenthalt. Mit der Tastatur geht es über „Hier anlegen“ am Aufenthalt."));
      var gruppe = el("div", "reise-schalter");
      Object.keys(KATEGORIEN).forEach(function (k) {
        var b = el("button", "reise-baustein", KATEGORIEN[k]);
        b.type = "button";
        b.dataset.kategorie = k;
        ziehbarMachen(b, { art: "baustein", kategorie: k, titel: "Neu: " + KATEGORIEN[k] });
        gruppe.appendChild(b);
      });
      palette.appendChild(gruppe);
      return palette;
    }

    function bauLager() {
      lager = el("div", "reise-feld reise-lager");
      lager.dataset.ablage = "lager";
      return lager;
    }

    function zeichneLager() {
      if (!lager) return;
      leer(lager);
      lager.appendChild(el("h3", null, "Zwischenlager"));
      var r = P.hilfen.route(P.zustand.auswahl);
      var e = P.hilfen.entwurf(r);

      if (!plan.zwischenlager.length) {
        lager.appendChild(el("p", "reise-leise",
          "Leer. Was du aus einer Route ziehst, landet hier und behält alle seine Daten. Gelöscht wird nichts."));
        return;
      }

      lager.appendChild(el("p", "reise-leise",
        plan.zwischenlager.length + " abgelegt. Zieh einen Eintrag auf einen Aufenthalt, oder nimm die Auswahl darunter."));

      var ul = el("ul", "reise-vorschlaege");
      plan.zwischenlager.forEach(function (eintrag) {
        var li = el("li", "reise-vorschlag reise-lagerstueck");
        var k = el("div", "reise-zeile-kopf");
        var griff = el("span", "reise-griff", "⠿");
        griff.setAttribute("aria-hidden", "true");
        k.appendChild(griff);
        k.appendChild(el("span", "reise-zeile-titel", eintrag.besuch.name));
        k.appendChild(el("span", "reise-zeile-neben", eintrag.herkunftName));
        li.appendChild(k);
        if (eintrag.besuch.interesse) li.appendChild(el("p", "reise-zeile-text", eintrag.besuch.interesse));
        li.appendChild(el("p", "reise-leise", eintrag.grund));

        ziehbarMachen(griff, { art: "lagereintrag", id: eintrag.id, titel: eintrag.besuch.name });

        var reihe = el("div", "reise-knopfreihe");
        var wahl = el("select");
        wahl.setAttribute("aria-label", "Zu welchem Aufenthalt");
        var leerOpt = el("option", null, "Zu Aufenthalt …");
        leerOpt.value = "";
        wahl.appendChild(leerOpt);
        e.aufenthalte.forEach(function (a) {
          var o = el("option", null, P.hilfen.nameDesHalts(a));
          o.value = a.id;
          wahl.appendChild(o);
        });
        wahl.addEventListener("change", function () {
          var halt = e.aufenthalte.filter(function (a) { return a.id === wahl.value; })[0];
          if (halt) ausLager(eintrag, r, halt);
        });
        reihe.appendChild(wahl);
        li.appendChild(reihe);
        ul.appendChild(li);
      });
      lager.appendChild(ul);
    }

    /* ------------------------------ Werkzeuge an Zeilen und Lücken - */

    function luecke(r, e, index) {
      var d = el("div", "reise-luecke");
      d.dataset.ablage = "luecke";
      d.dataset.stelle = String(index);
      d.appendChild(el("span", null, "Hier eine eigene Übernachtung einfügen"));
      return d;
    }

    function haltWerkzeug(r, e, a) {
      var reihe = el("div", "reise-knopfreihe");
      var wahl = el("select");
      wahl.setAttribute("aria-label", "Baustein bei " + P.hilfen.nameDesHalts(a) + " anlegen");
      var leerOpt = el("option", null, "Hier anlegen …");
      leerOpt.value = "";
      wahl.appendChild(leerOpt);
      Object.keys(KATEGORIEN).forEach(function (k) {
        var o = el("option", null, KATEGORIEN[k]);
        o.value = k;
        wahl.appendChild(o);
      });
      wahl.addEventListener("change", function () {
        var k = wahl.value;
        wahl.value = "";
        if (!k) return;
        frageBaustein(k, function (daten) {
          schritt("„" + daten.name + "“ bei " + P.hilfen.nameDesHalts(a) + " angelegt", function () {
            r.besuche.push(neuerBesuch(r, a, daten, r.besuche.length));
          });
        });
      });
      reihe.appendChild(wahl);
      return reihe;
    }

    function besuchWerkzeug(r, e, b) {
      var reihe = el("div", "reise-knopfreihe");

      var griff = el("button", "reise-griff", "⠿");
      griff.type = "button";
      griff.setAttribute("aria-label", "„" + b.name + "“ verschieben");
      ziehbarMachen(griff, { art: "besuch", id: b.id, titel: b.name });
      reihe.appendChild(griff);

      var wahl = el("select");
      wahl.setAttribute("aria-label", "„" + b.name + "“ zu einem anderen Aufenthalt");
      var leerOpt = el("option", null, "Verschieben nach …");
      leerOpt.value = "";
      wahl.appendChild(leerOpt);
      e.aufenthalte.forEach(function (a) {
        var o = el("option", null, P.hilfen.nameDesHalts(a));
        o.value = a.id;
        wahl.appendChild(o);
      });
      wahl.addEventListener("change", function () {
        var halt = e.aufenthalte.filter(function (a) { return a.id === wahl.value; })[0];
        wahl.value = "";
        if (halt) umhaengen(r, b, halt);
      });
      reihe.appendChild(wahl);

      var raus = el("button", "btn reise-winzig", "Ins Zwischenlager");
      raus.type = "button";
      raus.addEventListener("click", function () { insLager(r, b); });
      reihe.appendChild(raus);

      if (b.ortId && plan.orte[b.ortId] && plan.orte[b.ortId].genauigkeit === "vorlaeufig") {
        reihe.appendChild(el("span", "reise-marke-offen", "Punkt noch vorläufig, auf der Karte ziehen"));
      }
      return reihe;
    }

    /* ------------------------------------------- Export und Import - */

    function ausgeben() {
      var text = JSON.stringify(plan, null, 2);
      var blob = new Blob([text], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "reiseplan.json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      W.standTitel = "Als Datei gesichert";
      zeigeStand();
    }

    function einlesen() {
      var f = document.createElement("input");
      f.type = "file";
      f.accept = "application/json,.json";
      f.addEventListener("change", function () {
        var datei = f.files && f.files[0];
        if (!datei) return;
        if (datei.size > 5 * 1024 * 1024) {
          hinweisEinmal("Die Datei ist größer als 5 MB. So groß kann ein Reiseplan nicht sein, deshalb wird nichts geändert.");
          return;
        }
        datei.text().then(function (text) {
          var neu;
          try { neu = JSON.parse(text); } catch (e2) {
            hinweisEinmal("Das ist keine gültige JSON Datei. Es wurde nichts geändert.");
            return;
          }
          var mangel = pruefePlan(neu);
          if (mangel) {
            hinweisEinmal("Die Datei passt nicht: " + mangel + ". Es wurde nichts geändert.");
            return;
          }
          zeigeImportVorschau(neu);
        });
      });
      f.click();
    }

    // Ein Import darf den Bestand nur ersetzen, wenn er wirklich ein
    // Reiseplan ist. Im Zweifel bleibt alles, wie es ist.
    function pruefePlan(p) {
      if (!p || typeof p !== "object") return "kein Objekt";
      if (p.schema !== plan.schema) return "Schemaversion " + p.schema + " statt " + plan.schema;
      if (!p.orte || typeof p.orte !== "object") return "keine Orte";
      if (!Array.isArray(p.routen) || !p.routen.length) return "keine Routen";
      var ids = Object.keys(p.orte);
      for (var i = 0; i < ids.length; i++) {
        var o = p.orte[ids[i]];
        if (o.lat === null || o.lat === undefined) continue;
        if (typeof o.lat !== "number" || typeof o.lon !== "number") return "Koordinate von " + ids[i] + " ist keine Zahl";
        if (o.lat < -90 || o.lat > 90 || o.lon < -180 || o.lon > 180) return "Koordinate von " + ids[i] + " liegt außerhalb der Erde";
      }
      for (var k = 0; k < p.routen.length; k++) {
        var r = p.routen[k];
        if (!Array.isArray(r.entwuerfe) || !r.entwuerfe.length) return "Route " + r.id + " hat keine Entwürfe";
        for (var m = 0; m < r.entwuerfe.length; m++) {
          var e = r.entwuerfe[m];
          for (var n = 0; n < e.aufenthalte.length; n++) {
            var a = e.aufenthalte[n];
            if (a.ortId && !p.orte[a.ortId]) return "Aufenthalt zeigt auf den fehlenden Ort " + a.ortId;
          }
        }
        for (var q = 0; q < (r.besuche || []).length; q++) {
          if (r.besuche[q].ortId && !p.orte[r.besuche[q].ortId]) return "Vorschlag zeigt auf den fehlenden Ort " + r.besuche[q].ortId;
        }
      }
      return null;
    }

    function zeigeImportVorschau(neu) {
      var kasten = el("div", "reise-frage");
      kasten.setAttribute("role", "dialog");
      kasten.setAttribute("aria-modal", "true");
      var k = el("div", "reise-frage-kasten");
      k.appendChild(el("h4", null, "Datei laden"));

      var altBesuche = plan.routen.reduce(function (s2, r) { return s2 + r.besuche.length; }, 0);
      var neuBesuche = neu.routen.reduce(function (s2, r) { return s2 + r.besuche.length; }, 0);

      var ul = el("ul", "reise-abschnitte");
      ul.appendChild(el("li", null, "Routen: " + plan.routen.length + " wird " + neu.routen.length));
      ul.appendChild(el("li", null, "Vorschläge: " + altBesuche + " wird " + neuBesuche));
      ul.appendChild(el("li", null, "Orte: " + Object.keys(plan.orte).length + " wird " + Object.keys(neu.orte).length));
      ul.appendChild(el("li", null, "Zwischenlager: " + plan.zwischenlager.length + " wird " + ((neu.zwischenlager || []).length)));
      ul.appendChild(el("li", null, "Revision: " + (plan.revision || 0) + " wird " + (neu.revision || 0)));
      k.appendChild(el("p", null, "Der gesamte Plan wird ersetzt. Rückgängig geht danach noch."));
      k.appendChild(ul);

      var reihe = el("div", "btn-row");
      var ok = el("button", "btn btn-primary", "Ersetzen");
      ok.type = "button";
      ok.addEventListener("click", function () {
        kasten.remove();
        schritt("Plan aus Datei geladen", function () { einsetzen(JSON.stringify(neu)); });
      });
      var weg = el("button", "btn", "Abbrechen");
      weg.type = "button";
      weg.addEventListener("click", function () { kasten.remove(); });
      reihe.appendChild(ok); reihe.appendChild(weg);
      k.appendChild(reihe);
      kasten.appendChild(k);
      document.body.appendChild(kasten);
      ok.focus();
    }

    /* --------------------------------------------------- Einhängen - */

    function vorZeichnen() {
      if (!P.zustand.bearbeiten) {
        if (leiste) leiste.hidden = true;
        if (palette) palette.hidden = true;
        if (lager) lager.hidden = true;
        return;
      }
      if (!leiste) {
        P.stellen.kopf.parentNode.insertBefore(bauLeiste(), P.stellen.kopf.nextSibling);
        P.stellen.seite.insertBefore(bauPalette(), P.stellen.seite.firstChild);
        P.stellen.seite.appendChild(bauLager());
      }
      leiste.hidden = false;
      palette.hidden = false;
      lager.hidden = false;
    }

    function nachZeichnen() {
      if (!P.zustand.bearbeiten || !leiste) return;
      zeichneLager();
      leiste._zurueck.disabled = !W.verlauf.length;
      leiste._vor.disabled = !W.zukunft.length;
      var ul = leer(leiste._verlaufListe);
      W.verlauf.slice(-8).reverse().forEach(function (s) { ul.appendChild(el("li", null, s.titel)); });
      if (!W.verlauf.length) ul.appendChild(el("li", "reise-leise", "Noch nichts geändert."));
      zeigeStand();
    }

    /* ------------------------------------------- Entwurf einlesen -- */

    // Beim Start nachsehen, ob im Browser ein Entwurf liegt. Ist die
    // veroeffentlichte Fassung neuer, wird nicht still ueberschrieben,
    // sondern gefragt.
    holen("entwurf").then(function (satz) {
      if (!satz || !satz.plan) return;
      if (JSON.stringify(satz.plan) === abbild()) return;
      var neuer = (plan.revision || 0) > (satz.basisRevision || 0);
      var kasten = el("div", "reise-frage");
      var k = el("div", "reise-frage-kasten");
      k.appendChild(el("h4", null, "Im Browser liegt ein Entwurf"));
      k.appendChild(el("p", null,
        "Gespeichert am " + new Date(satz.zeit).toLocaleString("de-DE") + ". " +
        (neuer
          ? "Die veröffentlichte Fassung ist inzwischen neuer, Revision " + plan.revision + " gegenüber " + satz.basisRevision + ". Deine Änderungen sind noch da, aber sie kennen den neuen Stand nicht."
          : "Er passt zur veröffentlichten Fassung.")));
      var reihe = el("div", "btn-row");
      var weiter = el("button", "btn btn-primary", "Entwurf weiter bearbeiten");
      weiter.type = "button";
      weiter.addEventListener("click", function () {
        einsetzen(JSON.stringify(satz.plan));
        kasten.remove();
        P.zeichne();
      });
      var frisch = el("button", "btn", "Veröffentlichte Fassung nehmen");
      frisch.type = "button";
      frisch.addEventListener("click", function () { kasten.remove(); });
      reihe.appendChild(weiter); reihe.appendChild(frisch);
      k.appendChild(reihe);
      kasten.appendChild(k);
      document.body.appendChild(kasten);
      weiter.focus();
    }).catch(function () { /* keine Datenbank, dann eben ohne */ });

    /* ------------------------------------------------- Tastenkürzel */

    document.addEventListener("keydown", function (ev) {
      if (!P.zustand.bearbeiten) return;
      if (ev.target.matches("input, textarea, select")) return;
      var strg = ev.ctrlKey || ev.metaKey;
      if (!strg) return;
      if (ev.key === "z" && !ev.shiftKey) { ev.preventDefault(); zurueck(); }
      else if ((ev.key === "z" && ev.shiftKey) || ev.key === "y") { ev.preventDefault(); vor(); }
    });

    var api = {
      luecke: luecke,
      haltWerkzeug: haltWerkzeug,
      besuchWerkzeug: besuchWerkzeug,
      punktGezogen: punktGezogen,
      vorZeichnen: vorZeichnen,
      nachZeichnen: nachZeichnen,
      zurueck: zurueck,
      vor: vor,
      ausgeben: ausgeben,
    };
    P.zustand.werkstatt = api;
    return api;
  }

  global.reisewerkstatt = werkstatt;
})(window);
