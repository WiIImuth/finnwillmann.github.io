/* ------------------------------------------------------------------
   Sprung auf einen Anker.

   Die Seite scrollt weich, und ein weicher Sprung beim Laden wird vom
   Browser gern abgebrochen. Deshalb springen wir hier selbst, hart und
   ohne Animation, und wiederholen es, sobald die Bilder geladen sind.
   Sobald der Besucher selbst scrollt, lassen wir ihn in Ruhe.
------------------------------------------------------------------ */

(() => {
  if (location.hash.length < 2) return;

  let target;
  try {
    target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  } catch (e) {
    return;
  }
  if (!target) return;

  let userMoved = false;
  const markMoved = () => { userMoved = true; };
  for (const event of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    addEventListener(event, markMoved, { passive: true, once: true });
  }

  const jump = () => {
    const root = document.documentElement;
    const before = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    target.scrollIntoView({ block: "start" });
    root.style.scrollBehavior = before;
  };

  const jumpIfIdle = () => { if (!userMoved) jump(); };

  jump();
  requestAnimationFrame(jumpIfIdle);
  addEventListener("load", jumpIfIdle, { once: true });
  setTimeout(jumpIfIdle, 250);
  setTimeout(jumpIfIdle, 900);
})();

/* ------------------------------------------------------------------
   Bewegung, Hell-Dunkel-Schalter und Kleinkram.

   Alles hier ist Zusatz. Ohne JavaScript bleibt die Seite vollständig
   lesbar, sie blendet dann nur nicht ein. Wer im Betriebssystem
   "weniger Bewegung" eingestellt hat, bekommt keine Animationen.
------------------------------------------------------------------ */

(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------- Hell und dunkel */

  // Dunkel ist der Grundzustand dieser Seite. Wer im Betriebssystem
  // hell eingestellt hat, bekommt hell, alle anderen bekommen dunkel.
  const media = window.matchMedia("(prefers-color-scheme: light)");

  const currentTheme = () => {
    const set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return media.matches ? "light" : "dark";
  };

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
    // Der Hintergrund der Startseite haengt am Zustand und muss es wissen.
    dispatchEvent(new Event("thema"));
  };

  for (const button of document.querySelectorAll(".theme-toggle")) {
    button.addEventListener("click", () => {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  // Ändert sich die Systemeinstellung und der Nutzer hat nie selbst
  // umgeschaltet, folgt die Seite dem System.
  media.addEventListener?.("change", () => {
    let saved = null;
    try {
      saved = localStorage.getItem("theme");
    } catch (e) {}
    if (!saved) {
      root.removeAttribute("data-theme");
      dispatchEvent(new Event("thema"));
    }
  });

  /* --------------------------------------- Kopfzeile beim Scrollen */

  const header = document.querySelector(".site-header");

  /* ------------------------------------------- Fortschrittsbalken */

  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  let ticking = false;

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = window.scrollY;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (header) header.classList.toggle("is-stuck", y > 4);
    ticking = false;
  };

  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );

  onScroll();

  /* ------------------------------------------------- Der eine Moment */

  // Auf der Startseite bleibt der Hero stehen, waehrend der Inhalt sich
  // darueber schiebt: der Name zieht sich in der Breite zusammen, der
  // Hintergrund baut sich von oben nach unten auf, der Hero verblasst.
  // Ein Wert von 0 bis 1 steuert alles, gestaltet wird im Stylesheet.
  // Ohne Skript steht der Wert auf 0 und die Seite ist vollstaendig da.

  const heldHero = document.querySelector(".page-home .hero-home");
  const buehne = document.querySelector(".page-home .buehne");

  let fortschritt = 0;
  let nachFortschritt = null;

  if (heldHero && !reduced) {
    let offen = false;
    let letzter = -1;

    const messen = () => {
      const weg = window.innerHeight * 1.5;
      const roh = Math.min(1, Math.max(0, window.scrollY / weg));
      // Frueher in hundert Stufen, weil die Breitenachse der Schrift
      // teuer war. Es bewegen sich jetzt nur noch transform und opacity,
      // und die kosten nichts. Also darf jeder Frame durch, und genau
      // das macht es weich statt gestuft.
      const p = Math.round(roh * 1000) / 1000;
      offen = false;
      if (p === letzter) return;
      letzter = p;
      fortschritt = p;
      heldHero.style.setProperty("--p", String(p));
      if (buehne) buehne.style.setProperty("--p", String(p));
      // Ab hier ist der Hero unsichtbar. Dann gehoert er auch nicht mehr
      // in die Tabreihenfolge und nicht mehr in die Vorlesereihenfolge.
      heldHero.classList.toggle("ist-weg", p >= 0.52);
      if (nachFortschritt) nachFortschritt();
    };

    addEventListener(
      "scroll",
      () => {
        if (!offen) {
          offen = true;
          requestAnimationFrame(messen);
        }
      },
      { passive: true }
    );

    addEventListener("resize", messen, { passive: true });
    messen();
  }

  /* -------------------------------------------- Neon und Hintergrund */

  if (buehne) {
    const wurzel = document.documentElement;

    // Der Neonbalken zieht sich beim Laden aus der Mitte auf. Stark
    // ausklingend: schneller Anlauf, weiches Ankommen.
    if (reduced) {
      wurzel.style.setProperty("--auf", "1");
    } else {
      let start = null;
      const zieh = (zeit) => {
        if (start === null) start = zeit;
        const t = Math.min(1, Math.max(0, (zeit - start - 260) / 1900));
        wurzel.style.setProperty("--auf", (1 - Math.pow(1 - t, 4)).toFixed(4));
        if (t < 1) requestAnimationFrame(zieh);
      };
      requestAnimationFrame(zieh);
    }

    const flaeche = buehne.querySelector(".shader");
    let motor = null;
    let imBild = true;
    let wach = !document.hidden;

    const istDunkel = () => currentTheme() === "dark";

    const anwerfen = () => {
      if (motor || reduced || !flaeche || !window.hintergrundShader) return;
      motor = window.hintergrundShader(flaeche, {
        // Absichtlich unter der Bildschirmaufloesung gerechnet. Weiche
        // Verlaeufe vertragen das, und es ist der groesste Gewinn.
        mass: 0.55,
        wellen: {
          horizonColor: "#241640",
          waveColor: "#6a34d8",
          crestColor: "#c9a6ff",
          speed: 0.22,
          steps: 28,
          brightness: 0.9,
          opacity: 0.5,
          tilt: 1.11,
          fogDepth: 15,
        },
        strahlen: {
          colors: ["#cea4ff", "#b86fff", "#ffa5e2"],
          backgroundColor: "#2a1150",
          speed: 0.55,
          streakCount: 2,
          streakLength: 1.15,
          density: 0.28,
          twinkle: 0.8,
          zoom: 3.5,
          glow: 0.65,
          backgroundGlow: 0.25,
          opacity: 0.5,
        },
        // Hell ist eigenstaendig komponiert, in Blau statt Violett. Der
        // Ton ist nicht frei gewaehlt: es ist der kuehle Zweitton, den die
        // Seite im dunklen Zustand ohnehin schon fuehrt. Die Farben sind
        // kraeftiger, weil sie die Flaeche einfaerben statt sie
        // aufzuhellen, die Wellen blasser, sonst wird das Papier schmutzig.
        wellenHell: {
          horizonColor: "#b2cbf9",
          waveColor: "#3778d7",
          crestColor: "#bfd9ff",
          speed: 0.22,
          steps: 28,
          brightness: 1,
          opacity: 0.22,
          tilt: 1.11,
          fogDepth: 15,
        },
        strahlenHell: {
          colors: ["#1853c6", "#0081e7", "#00a4e7"],
          backgroundColor: "#a8c6f2",
          speed: 0.55,
          streakCount: 2,
          streakLength: 1.15,
          density: 0.28,
          twinkle: 0.8,
          zoom: 3.5,
          glow: 0.65,
          // Ohne Hintergrundschein: auf hellem Grund zieht der helle
          // Zweig die Farbe aus dem Verhaeltnis der Kanaele, und der
          // Schein kippt dabei ins Magenta statt ins Blaue.
          backgroundGlow: 0,
          opacity: 0.55,
        },
      });
      if (motor) {
        motor.modus(!istDunkel());
        motor.neuMessen();
      }
    };

    // Gerechnet wird nur, wenn die Flaeche im Bild ist, der Tab vorn
    // liegt, der dunkle Zustand aktiv ist und ueberhaupt schon etwas
    // davon zu sehen waere.
    const pruefen = () => {
      if (!motor) anwerfen();
      if (!motor) return;
      motor.modus(!istDunkel());
      if (imBild && wach && fortschritt > 0.005) motor.an();
      else motor.aus();
      // Je weiter der Inhalt darueberliegt, desto ruhiger wird es.
      motor.ruhe(fortschritt);
    };

    nachFortschritt = pruefen;

    if (!reduced) {
      addEventListener(
        "resize",
        () => {
          if (motor) motor.neuMessen();
        },
        { passive: true }
      );

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(
          (eintraege) => {
            imBild = eintraege[0].isIntersecting;
            pruefen();
          },
          { threshold: 0 }
        ).observe(buehne);
      }

      addEventListener("visibilitychange", () => {
        wach = !document.hidden;
        pruefen();
      });

      addEventListener("thema", pruefen);

      pruefen();
    }
  }


  /* ------------------------------------------- Wellen auf Unterseiten */

  // Dieselbe Buehne wie auf der Startseite, nur ohne Neon und ohne
  // Scrollverlauf. Es laeuft nur der Wellen-Shader, also ein Programm
  // pro Bild statt zwei. Alles andere gilt unveraendert: kleiner
  // gerechnet als der Bildschirm, gedeckelte Bildrate, aus ausserhalb
  // des Bildes, aus im versteckten Tab, aus bei weniger Bewegung, und
  // ohne WebGL2 bleibt die Flaeche einfach leer.

  const wellenBuehne = document.querySelector(".wellen-buehne");

  if (wellenBuehne && !reduced) {
    const wellenFlaeche = wellenBuehne.querySelector(".shader");
    let wellenMotor = null;
    let wellenImBild = true;
    let wellenWach = !document.hidden;

    const wellenAnwerfen = () => {
      if (wellenMotor || !wellenFlaeche || !window.hintergrundShader) return;
      wellenMotor = window.hintergrundShader(wellenFlaeche, {
        nurWellen: true,
        mass: 0.55,
        wellen: {
          horizonColor: "#241640",
          waveColor: "#6a34d8",
          crestColor: "#c9a6ff",
          speed: 0.18,
          steps: 28,
          brightness: 0.9,
          opacity: 0.6,
          tilt: 1.11,
          fogDepth: 15,
        },
        wellenHell: {
          horizonColor: "#b2cbf9",
          waveColor: "#3778d7",
          crestColor: "#bfd9ff",
          speed: 0.18,
          steps: 28,
          brightness: 1,
          opacity: 0.28,
          tilt: 1.11,
          fogDepth: 15,
        },
      });
      if (wellenMotor) {
        wellenMotor.modus(currentTheme() !== "dark");
        wellenMotor.neuMessen();
      }
    };

    const wellenPruefen = () => {
      if (!wellenMotor) wellenAnwerfen();
      if (!wellenMotor) return;
      wellenMotor.modus(currentTheme() !== "dark");
      if (wellenImBild && wellenWach) wellenMotor.an();
      else wellenMotor.aus();
    };

    addEventListener(
      "resize",
      () => {
        if (wellenMotor) wellenMotor.neuMessen();
      },
      { passive: true }
    );

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (eintraege) => {
          wellenImBild = eintraege[0].isIntersecting;
          wellenPruefen();
        },
        { threshold: 0 }
      ).observe(wellenBuehne);
    }

    addEventListener("visibilitychange", () => {
      wellenWach = !document.hidden;
      wellenPruefen();
    });

    addEventListener("thema", wellenPruefen);

    wellenPruefen();
  }

  /* ------------------------------------------- Navigation bei schmal */

  const kopf = document.querySelector(".site-header");
  const schalter = document.querySelector(".nav-toggle");

  if (kopf && schalter) {
    const schliessen = () => {
      kopf.classList.remove("nav-offen");
      schalter.setAttribute("aria-expanded", "false");
    };

    schalter.addEventListener("click", () => {
      const offen = kopf.classList.toggle("nav-offen");
      schalter.setAttribute("aria-expanded", offen ? "true" : "false");
    });

    for (const link of document.querySelectorAll(".site-nav a")) {
      link.addEventListener("click", schliessen);
    }

    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && kopf.classList.contains("nav-offen")) {
        schliessen();
        schalter.focus();
      }
    });
  }

  /* ------------------------------------------------ Zoom und Verschieben */

  let scale = 1;
  let tx = 0;
  let ty = 0;

  const paint = () => {
    big.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    box.classList.toggle("is-zoomed", scale > 1.01);
  };

  // Die unverzerrte Größe lässt sich aus der aktuellen zurückrechnen.
  const baseBox = () => {
    const r = big.getBoundingClientRect();
    return {
      w: r.width / scale,
      h: r.height / scale,
      cx: r.left + r.width / 2 - tx,
      cy: r.top + r.height / 2 - ty,
    };
  };

  const clamp = () => {
    const b = baseBox();
    const limitX = Math.max(0, (b.w * scale - box.clientWidth) / 2);
    const limitY = Math.max(0, (b.h * scale - box.clientHeight) / 2);
    tx = Math.min(limitX, Math.max(-limitX, tx));
    ty = Math.min(limitY, Math.max(-limitY, ty));
  };

  // Zoomt so, dass der Punkt unter dem Zeiger an Ort und Stelle bleibt.
  const zoomAt = (factor, clientX, clientY) => {
    const next = Math.min(MAX, Math.max(1, scale * factor));
    if (next === scale) return;
    const b = baseBox();
    const px = (clientX ?? b.cx) - b.cx;
    const py = (clientY ?? b.cy) - b.cy;
    tx = px - (px - tx) * (next / scale);
    ty = py - (py - ty) * (next / scale);
    scale = next;
    if (scale === 1) { tx = 0; ty = 0; }
    clamp();
    paint();
  };

  const resetZoom = () => {
    scale = 1;
    tx = 0;
    ty = 0;
    big.style.transform = "";
    box.classList.remove("is-zoomed");
  };

  /* ---------------------------------------------------------- Anzeigen */

  const thumbOf = (i) => triggers[i]?.querySelector("img");

  const show = (i, animateFrom) => {
    index = (i + triggers.length) % triggers.length;
    resetZoom();
    big.src = triggers[index].getAttribute("href");
    big.alt = thumbOf(index)?.alt || "";
    counter.textContent = `${index + 1} / ${triggers.length}`;

    const multiple = triggers.length > 1;
    prevBtn.hidden = !multiple;
    nextBtn.hidden = !multiple;

    if (reduced || !animateFrom) return;

    // Das große Bild startet dort, wo das kleine sitzt, und wächst auf.
    const run = () => {
      const to = big.getBoundingClientRect();
      if (!to.width) return;
      big.animate(
        [
          {
            transform: `translate(${animateFrom.left - to.left}px, ${animateFrom.top - to.top}px) scale(${
              animateFrom.width / to.width
            }, ${animateFrom.height / to.height})`,
            opacity: 0.4,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: 480, easing: EASE }
      );
    };

    if (big.complete) run();
    else big.addEventListener("load", run, { once: true });
  };

  const open = (i) => {
    lastFocus = document.activeElement;
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    requestAnimationFrame(() => box.classList.add("is-open"));
    show(i, thumbOf(i)?.getBoundingClientRect());
    box.querySelector(".lightbox-close").focus({ preventScroll: true });
  };

  const close = () => {
    box.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    setTimeout(() => {
      box.hidden = true;
      big.removeAttribute("src");
      resetZoom();
    }, reduced ? 0 : 450);
    lastFocus?.focus?.({ preventScroll: true });
  };

  for (const [, items] of groups) {
    items.forEach((a, i) => {
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        triggers = items;
        open(i);
      });
    });
  }

  box.querySelector(".lightbox-close").addEventListener("click", close);
  prevBtn.addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });
  nextBtn.addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });
  zoomIn.addEventListener("click", (e) => { e.stopPropagation(); zoomAt(1.5); });
  zoomOut.addEventListener("click", (e) => { e.stopPropagation(); zoomAt(1 / 1.5); });

  big.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (scale > 1.01) resetZoom();
    else zoomAt(2.5, e.clientX, e.clientY);
  });

  box.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    },
    { passive: false }
  );

  /* --------------------------------------------- Ziehen, Wischen, Kneifen */

  const pointers = new Map();
  let dragged = 0;
  let startTx = 0;
  let startTy = 0;
  let pinchStart = 0;
  let pinchScale = 1;

  const spread = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  box.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX });
    dragged = 0;
    startTx = tx;
    startTy = ty;
    if (pointers.size === 2) {
      pinchStart = spread();
      pinchScale = scale;
    }
    if (e.target === big && scale > 1.01) big.setPointerCapture?.(e.pointerId);
  });

  box.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (pointers.size === 2) {
      pointers.set(e.pointerId, { ...p, x: e.clientX, y: e.clientY });
      const now = spread();
      if (pinchStart > 0) {
        const [a, b] = [...pointers.values()];
        const target = Math.min(MAX, Math.max(1, (pinchScale * now) / pinchStart));
        zoomAt(target / scale, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      dragged = 99;
      return;
    }

    if (scale > 1.01) {
      tx = startTx + dx;
      ty = startTy + dy;
      clamp();
      paint();
      dragged += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) || 1;
    }
  });

  const endPointer = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;

    // Wischen blättert, aber nur im nicht vergrößerten Zustand
    if (p && scale <= 1.01 && triggers.length > 1) {
      const dx = e.clientX - p.x;
      if (Math.abs(dx) > 60) {
        show(index + (dx < 0 ? 1 : -1));
        dragged = 99;
      }
    }
  };

  box.addEventListener("pointerup", endPointer);
  box.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));

  // Klick daneben schließt, ein Ziehen jedoch nicht
  box.addEventListener("click", (e) => {
    if (e.target === box && dragged < 6) close();
  });

  addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "+" || e.key === "=") zoomAt(1.5);
    else if (e.key === "-") zoomAt(1 / 1.5);
    else if (e.key === "0") resetZoom();
    else if (e.key === "Tab") {
      const items = [...box.querySelectorAll("button:not([hidden])")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  addEventListener("resize", () => {
    if (box.hidden) return;
    clamp();
    paint();
  });
})();
