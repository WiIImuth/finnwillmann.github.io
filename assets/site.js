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

   Bilder in Galerien öffnen sich groß. Der Übergang beginnt genau
   dort, wo das kleine Bild sitzt, und wächst von da auf. Schließen
   über das Kreuz, einen Klick daneben oder die Escape-Taste, blättern
   mit den Pfeiltasten.

   Ohne JavaScript bleiben die Bilder normale Links auf die Bilddatei.
------------------------------------------------------------------ */

(() => {
  const all = [...document.querySelectorAll(".shots a, .cover-frame a")];
  if (!all.length) return;

  // Jede Galerie bleibt für sich. Weiterblättern führt nicht aus einer
  // Arbeit in die nächste.
  const groups = new Map();
  for (const a of all) {
    const key = a.closest(".shots, .cover-frame");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }

  let triggers = all;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

  const words =
    document.documentElement.lang === "en"
      ? { close: "Close", prev: "Previous image", next: "Next image" }
      : { close: "Schließen", prev: "Vorheriges Bild", next: "Nächstes Bild" };

  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.hidden = true;
  box.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="${words.close}">✕</button>
    <button class="lightbox-nav prev" type="button" aria-label="${words.prev}">‹</button>
    <button class="lightbox-nav next" type="button" aria-label="${words.next}">›</button>
    <img alt="">
    <p class="lightbox-counter"></p>`;
  document.body.appendChild(box);

  const big = box.querySelector("img");
  const counter = box.querySelector(".lightbox-counter");
  const prevBtn = box.querySelector(".prev");
  const nextBtn = box.querySelector(".next");

  let index = 0;
  let lastFocus = null;

  const sourceOf = (a) => a.getAttribute("href");
  const thumbOf = (i) => triggers[i]?.querySelector("img");

  const show = (i, animateFrom) => {
    index = (i + triggers.length) % triggers.length;
    big.src = sourceOf(triggers[index]);
    big.alt = thumbOf(index)?.alt || "";
    counter.textContent = `${index + 1} / ${triggers.length}`;

    const multiple = triggers.length > 1;
    prevBtn.hidden = !multiple;
    nextBtn.hidden = !multiple;

    if (reduced || !animateFrom) return;

    // Das große Bild startet in der Größe und Position des kleinen
    // und wächst von dort auf seinen Platz.
    const run = () => {
      const to = big.getBoundingClientRect();
      if (!to.width) return;
      const from = animateFrom;
      const scale = Math.max(from.width / to.width, 0.05);
      big.animate(
        [
          {
            transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale}, ${
              from.height / to.height
            })`,
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

  const open = (i, trigger) => {
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
    }, reduced ? 0 : 450);
    lastFocus?.focus?.({ preventScroll: true });
  };

  for (const [container, items] of groups) {
    items.forEach((a, i) => {
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        triggers = items;
        open(i, a);
      });
    });
  }

  box.querySelector(".lightbox-close").addEventListener("click", close);

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index - 1);
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index + 1);
  });

  // Klick neben das Bild schließt
  box.addEventListener("click", (e) => {
    if (e.target === box) close();
  });

  addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "Tab") {
      // Fokus bleibt im Dialog
      const items = [...box.querySelectorAll("button:not([hidden])")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Wischen auf dem Telefon
  let startX = null;
  box.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  }, { passive: true });
})();
