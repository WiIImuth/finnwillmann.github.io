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

  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const currentTheme = () => {
    const set = root.getAttribute("data-theme");
    if (set === "light" || set === "dark") return set;
    return media.matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}
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
    if (!saved) root.removeAttribute("data-theme");
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

  /* -------------------------------------------- Einflug beim Scrollen */

  if (reduced || !("IntersectionObserver" in window)) {
    for (const el of document.querySelectorAll("[data-anim]")) el.classList.add("is-in");
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.06 }
    );

    for (const el of document.querySelectorAll("[data-anim]")) {
      // Was beim Laden schon im Bild ist, kommt sofort herein und
      // wartet nicht auf eine Scrollbewegung, die nie passiert.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        requestAnimationFrame(() => el.classList.add("is-in"));
      } else {
        observer.observe(el);
      }
    }
  }

  /* ------------------------------------------------ Licht auf den Karten */

  if (!reduced && matchMedia("(hover: hover)").matches) {
    for (const card of document.querySelectorAll(".card")) {
      card.addEventListener(
        "pointermove",
        (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
          card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
        },
        { passive: true }
      );
      card.addEventListener("pointerleave", () => {
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      });
    }
  }

  /* -------------------------------------------------------- Parallaxe */

  if (!reduced) {
    // Nur auf unbeschnittenen Bildern. In den Karten und der Galerie
    // sitzt das Bild exakt im Rahmen, ein Versatz würde dort eine
    // Kante freilegen.
    const layers = [...document.querySelectorAll(".cover")];

    if (layers.length) {
      let pending = false;

      const shift = () => {
        const h = window.innerHeight;
        for (const el of layers) {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > h + 200) continue;
          // -1 am oberen Rand, +1 am unteren: daraus ein sanfter Versatz
          const p = (r.top + r.height / 2 - h / 2) / (h / 2);
          el.style.translate = `0 ${(p * -16).toFixed(2)}px`;
        }
        pending = false;
      };

      addEventListener(
        "scroll",
        () => {
          if (!pending) {
            pending = true;
            requestAnimationFrame(shift);
          }
        },
        { passive: true }
      );

      addEventListener("resize", shift, { passive: true });
      shift();
    }
  }
})();

/* ------------------------------------------------------------------
   Lightbox.

   Bilder öffnen sich groß und passen sich immer vollständig in den
   Bildschirm ein, egal ob hoch oder quer. Zoomen über Mausrad,
   Doppelklick, die Knöpfe unten oder zwei Finger. Im vergrößerten
   Zustand lässt sich das Bild ziehen.

   Schließen über das Kreuz, einen Klick daneben oder Escape,
   blättern mit den Pfeilen oder durch Wischen.

   Ohne JavaScript bleiben die Bilder normale Links auf die Datei.
------------------------------------------------------------------ */

(() => {
  const all = [...document.querySelectorAll(".shots a, .cover-frame a")];
  if (!all.length) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
  const MAX = 6;

  const en = document.documentElement.lang === "en";
  const words = en
    ? { close: "Close", prev: "Previous image", next: "Next image", zoomIn: "Zoom in", zoomOut: "Zoom out" }
    : { close: "Schließen", prev: "Vorheriges Bild", next: "Nächstes Bild", zoomIn: "Vergrößern", zoomOut: "Verkleinern" };

  // Jede Galerie bleibt für sich. Weiterblättern führt nicht aus einer
  // Arbeit in die nächste.
  const groups = new Map();
  for (const a of all) {
    const key = a.closest(".shots, .cover-frame");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }

  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.hidden = true;
  box.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="${words.close}">✕</button>
    <button class="lightbox-nav prev" type="button" aria-label="${words.prev}">‹</button>
    <button class="lightbox-nav next" type="button" aria-label="${words.next}">›</button>
    <img alt="" draggable="false">
    <div class="lightbox-tools">
      <button class="lightbox-zoom out" type="button" aria-label="${words.zoomOut}">−</button>
      <span class="lightbox-counter"></span>
      <button class="lightbox-zoom in" type="button" aria-label="${words.zoomIn}">+</button>
    </div>`;
  document.body.appendChild(box);

  const big = box.querySelector("img");
  const counter = box.querySelector(".lightbox-counter");
  const prevBtn = box.querySelector(".prev");
  const nextBtn = box.querySelector(".next");
  const zoomIn = box.querySelector(".lightbox-zoom.in");
  const zoomOut = box.querySelector(".lightbox-zoom.out");

  let triggers = all;
  let index = 0;
  let lastFocus = null;

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
