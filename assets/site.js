/* ------------------------------------------------------------------
   Bewegung und Interaktion.

   Alles hier ist Zusatz: Ohne JavaScript bleibt die Seite vollständig
   lesbar, sie blendet dann nur nicht ein. Wer „weniger Bewegung" im
   Betriebssystem eingestellt hat, bekommt gar keine Animationen.
------------------------------------------------------------------ */

(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------- Fortschrittsbalken */

  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  let ticking = false;
  const updateBar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.transform = `scaleX(${pct / 100})`;
    ticking = false;
  };
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateBar);
      }
    },
    { passive: true }
  );
  updateBar();

  /* ------------------------------------------------ Einblenden beim Scrollen */

  if (reduced || !("IntersectionObserver" in window)) return;

  const blocks = document.querySelectorAll(
    ".page-header, main > section, .project > header, .project > dl, .project > img, .project > .prose"
  );

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );

  blocks.forEach((el, i) => {
    el.dataset.reveal = "";
    // Die ersten Blöcke sind beim Laden schon sichtbar und sollen
    // gestaffelt hereinkommen statt auf das Scrollen zu warten.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.style.setProperty("--delay", `${Math.min(i, 4) * 70}ms`);
      requestAnimationFrame(() => el.classList.add("is-in"));
    } else {
      observer.observe(el);
    }
  });

  /* --------------------------------------- Karten: Zeiger folgt dem Licht */

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
})();
