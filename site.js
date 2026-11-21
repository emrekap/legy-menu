(() => {
  "use strict";

  // ---- Config -------------------------------------------------------------

  // PLACEHOLDER: replace with the real number before launch.
  // International format, digits only (no +, spaces or dashes).
  const WHATSAPP_NUMBER = "905550000000";
  const WHATSAPP_MESSAGE = {
    tr: "Merhaba, masa rezervasyonu yapmak istiyorum.",
    en: "Hi, I'd like to reserve a table.",
  };

  // Shared with app.js, so the menu opens in the language chosen here.
  const STORAGE_KEY = "menu-language";
  const DEFAULT_LANGUAGE = "tr";

  // English strings, keyed by the data-i18n keys in index.html. The Turkish
  // text is read from the page itself at start-up.
  const EN = {
    "meta.description": "Live DJs, signature cocktails and late nights in Istanbul. Reserve on WhatsApp.",
    "nav.label": "Sections",
    "nav.nights": "Nights",
    "nav.cocktails": "Cocktails",
    "nav.gallery": "Gallery",
    "nav.visit": "Visit",
    "nav.reserve": "Reserve",
    "hero.title": "Live DJs.<br>Signature cocktails.<br><em>Late nights.</em>",
    "hero.tonight": "Tonight · Doors 21:00",
    "cta.whatsapp": "Reserve on WhatsApp",
    "cta.menu": "See the menu",
    "marquee.djs": "Live DJs",
    "marquee.cocktails": "Signature cocktails",
    "marquee.late": "Late nights",
    "intro.title": "A sanctuary for the night.<br>Where rhythm meets refinement.",
    "intro.body": "Légy İstanbul is an immersion into sound, taste and atmosphere. Step through the doors and leave the city behind.",
    "alt.martinis": "A guest holding two martinis",
    "nights.label": "Weekly lineup",
    "nights.title": "Nights",
    "day.thu": "Thursday",
    "day.fri": "Friday",
    "day.sat": "Saturday",
    "dj.guest": "Guest DJ",
    "dj.special": "Special guest",
    "genre.electronic": "Electronic",
    "cocktails.label": "From the bar",
    "cocktails.title": "Signature cocktails",
    "ing.verde": "Beefeater · homemade elderflower liqueur · sorrel · green apple · citrus",
    "ing.ritmo": "Código · Ojo de Tigre · Aperol · passion fruit · pineapple · lime · chili",
    "ing.mora": "Absolut · blackberry, raspberry &amp; blueberry liqueur · bergamot · lime",
    "ing.paloma": "Código · Ojo de Tigre · Campari · grapefruit · soda",
    "ing.bite": "Chivas Extra Smooth &amp; Smokey · Lapsang Souchong · pear &amp; ginger cordial · lemon",
    "cocktails.cta": "See the full menu",
    "alt.berry": "Red berry cocktail with the Légy logo",
    "alt.tray": "Three cocktails on a tray",
    "gallery.title": "Gallery",
    "alt.booth": "The DJ booth with the Légy logo, chandelier and neon smiley",
    "alt.crowd": "The crowd under the neon smiley",
    "alt.dj": "DJ playing to a packed crowd",
    "gallery.follow": 'Follow <span lang="en">@legyistanbul</span>',
    "reserve.title": "Your table is one<br>message away.",
    "reserve.body": "Message us on WhatsApp for table reservations, bottle service and large groups.",
    "reserve.cta": "Message us",
    "visit.label": "Location",
    "visit.title": "Visit",
    "visit.address": "Address",
    "visit.hours": "Hours",
    "visit.days": "Wednesday – Saturday",
    "visit.door": "Door policy",
    "visit.doorText": "21+ · Smart casual dress.",
    "visit.phone": "Phone",
    "visit.map": "Map",
    "footer.instagram": "Légy on Instagram",
    "footer.menu": "Menu",
    "footer.rights": "© 2026 Légy İstanbul. All rights reserved.",
  };

  // ---- Language -----------------------------------------------------------

  const html = document.documentElement;
  const warned = new Set();

  // Turkish text as authored in the HTML, captured before anything changes.
  const textItems = [...document.querySelectorAll("[data-i18n]")].map((el) => ({
    el,
    key: el.dataset.i18n,
    tr: el.innerHTML,
  }));
  const attrItems = [];
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const cut = pair.indexOf(":");
      if (cut < 1) return;
      const attr = pair.slice(0, cut).trim();
      attrItems.push({ el, attr, key: pair.slice(cut + 1).trim(), tr: el.getAttribute(attr) });
    });
  });

  function translate(key, lang, turkish) {
    if (lang === "tr") return turkish;
    if (Object.hasOwn(EN, key)) return EN[key];
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`site.js: no English text for "${key}", keeping Turkish.`);
    }
    return turkish;
  }

  function readSaved() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "tr" || saved === "en") return saved;
    } catch {
      // Storage can be blocked (private mode); the default still works.
    }
    return DEFAULT_LANGUAGE;
  }

  function save(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // See readSaved.
    }
  }

  function applyLanguage(lang) {
    html.lang = lang;
    textItems.forEach(({ el, key, tr }) => {
      el.innerHTML = translate(key, lang, tr);
    });
    attrItems.forEach(({ el, attr, key, tr }) => {
      el.setAttribute(attr, translate(key, lang, tr));
    });
    document.querySelectorAll(".lang-switch button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE[lang])}`;
    document.querySelectorAll("[data-whatsapp]").forEach((a) => {
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  document.querySelectorAll(".lang-switch button").forEach((button) => {
    button.addEventListener("click", () => {
      const lang = button.dataset.lang === "en" ? "en" : "tr";
      applyLanguage(lang);
      save(lang);
    });
  });

  applyLanguage(readSaved());

  // ---- Nav ----------------------------------------------------------------

  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  const wide = window.matchMedia("(min-width: 768px)");
  let ticking = false;

  function updateNav() {
    ticking = false;
    const open = nav.classList.contains("is-open");
    nav.classList.toggle("is-scrolled", open || window.scrollY > 40);
  }

  function requestNavUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateNav);
  }

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    updateNav();
  }

  window.addEventListener("scroll", requestNavUpdate, { passive: true });
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  document.querySelectorAll("#nav-links a").forEach((a) => {
    a.addEventListener("click", () => setOpen(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
  wide.addEventListener("change", () => {
    if (wide.matches) setOpen(false);
  });
  updateNav();

  // ---- Reveal on scroll ---------------------------------------------------

  const reveals = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );
    reveals.forEach((el) => observer.observe(el));
  }
})();
