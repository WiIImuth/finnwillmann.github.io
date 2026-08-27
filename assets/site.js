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
