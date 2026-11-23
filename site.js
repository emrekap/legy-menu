(() => {
  "use strict";

  // ---- Config -------------------------------------------------------------

  // What the venue manager saved at /admin: the WhatsApp number, the open
  // nights, the door time and the English texts of the venue details and
  // cocktails. functions/index.js puts it in the page as <script id="site-data">.
  // The values below it are used only if the page comes without it.
  const SITE = (() => {
    try {
      const data = JSON.parse(document.getElementById("site-data").textContent);
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  })();

  // Only the digits are used.
  const WHATSAPP_NUMBER = SITE.whatsapp || "905550000000";
  const WHATSAPP_MESSAGE = {
    tr: "Merhaba, masa rezervasyonu yapmak istiyorum.",
    en: "Hi, I'd like to reserve a table.",
  };

  // Open nights: 0 = Sunday, 1 = Monday ... 6 = Saturday.
  const OPEN_DAYS = Array.isArray(SITE.openDays) ? SITE.openDays : [3, 4, 5, 6];
  // Door time on the first screen.
  const DOORS = typeof SITE.doors === "string" ? SITE.doors : "21:00";

  // Words for the first-screen line ("Tonight · Doors 21:00" on open nights,
  // otherwise the next open night, e.g. "Wednesday · Doors 21:00") and for the
  // dates on the lineup cards ("Friday · 28 Nov").
  const NIGHT_TEXT = {
    tr: {
      tonight: "Bu gece",
      doors: "Kapılar",
      days: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
      months: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
    },
    en: {
      tonight: "Tonight",
      doors: "Doors",
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
  };

  // The DJ lineup comes from here. The venue manager edits it at /admin;
  // see functions/api/lineup.js. Cards show the nights of the next LINEUP_DAYS days.
  const LINEUP_URL = "/api/lineup";
  const LINEUP_DAYS = 7;

  // Shared with app.js, so the menu opens in the language chosen here.
  const STORAGE_KEY = "menu-language";
  const DEFAULT_LANGUAGE = "tr";

  // English strings, keyed by the data-i18n keys in index.html. The Turkish
  // text is read from the page itself at start-up. The venue details and the
  // cocktails come from SITE (see the end of this list); the ones typed here
  // are used only if the page comes without it.
  const EN = {
    "meta.description": "Live DJs, signature cocktails and late nights in Istanbul. Reserve on WhatsApp.",
    "nav.label": "Sections",
    "nav.nights": "Nights",
    "nav.cocktails": "Cocktails",
    "nav.gallery": "Gallery",
    "nav.visit": "Visit",
    "nav.menu": "Menu",
    "nav.reserve": "Reserve",
    "hero.title": "Live DJs.<br>Signature cocktails.<br><em>Late nights.</em>",
    "hero.tonight": "Wednesday – Saturday · Doors 21:00",
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
    "nights.empty": "The lineup is coming soon.",
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
    "visit.directions": "Get directions",
    "visit.mapTitle": "Map of Légy İstanbul",
    "footer.instagram": "Légy on Instagram",
    "footer.menu": "Menu",
    "footer.rights": "© 2026 Légy İstanbul. All rights reserved.",
  };
  if (SITE.en && typeof SITE.en === "object") Object.assign(EN, SITE.en);

  // ---- Dates --------------------------------------------------------------

  // The date of the night that is on in Istanbul, as "YYYY-MM-DD", whatever the
  // visitor's own clock says. Until 04:00 the night before is still going.
  function istanbulNightDate() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(Date.now() - 4 * 60 * 60 * 1000));
    const part = (type) => parts.find((p) => p.type === type).value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  // "YYYY-MM-DD" as a Date at midnight UTC, so the day never shifts with the
  // visitor's time zone. Read it with getUTC... only.
  function dayOf(date) {
    return new Date(`${date}T00:00:00Z`);
  }

  function addDays(date, days) {
    const d = dayOf(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // ---- Reveal on scroll ---------------------------------------------------

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealObserver =
    reduceMotion || !("IntersectionObserver" in window)
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.1 },
        );

  // Also used for the lineup cards, which arrive after the page has loaded.
  function revealOnScroll(el) {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add("is-visible");
  }

  document.querySelectorAll(".reveal").forEach(revealOnScroll);

  // Reveal is set up; tells the head script that the page does not need its no-JS fallback.
  document.documentElement.classList.add("js-ready");

  // ---- Language -----------------------------------------------------------
  try {
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
      if (Object.prototype.hasOwnProperty.call(EN, key)) return EN[key];
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

    // Which night it is in Istanbul (0 = Sunday ... 6 = Saturday).
    function istanbulNight() {
      return dayOf(istanbulNightDate()).getUTCDay();
    }

    // Open tonight: "Tonight · Doors 21:00" with the live dot. Closed: the next
    // open night, no dot. If this fails, the always-true line from the HTML stays.
    const tonight = document.querySelector(".tonight");
    const tonightText = tonight && tonight.querySelector("[data-i18n]");

    function showTonight(lang) {
      if (!tonightText) return;
      tonight.classList.remove("is-live");
      try {
        const words = NIGHT_TEXT[lang];
        const night = istanbulNight();
        if (night < 0) return;
        let wait = 0; // nights until the next open one
        while (wait < 7 && !OPEN_DAYS.includes((night + wait) % 7)) wait += 1;
        if (wait === 7) return; // OPEN_DAYS is empty
        const when = wait === 0 ? words.tonight : words.days[(night + wait) % 7];
        tonightText.textContent = `${when} · ${words.doors} ${DOORS}`;
        tonight.classList.toggle("is-live", wait === 0);
      } catch (error) {
        console.error("site.js: tonight line failed", error);
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
      showTonight(lang);
      document.querySelectorAll(".lang-switch button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
      });
      const href = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(WHATSAPP_MESSAGE[lang])}`;
      document.querySelectorAll("[data-whatsapp]").forEach((a) => {
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener";
      });
      // The lineup redraws its dates in the new language.
      document.dispatchEvent(new CustomEvent("legy:language", { detail: lang }));
    }

    document.querySelectorAll(".lang-switch button").forEach((button) => {
      button.addEventListener("click", () => {
        const lang = button.dataset.lang === "en" ? "en" : "tr";
        applyLanguage(lang);
        save(lang);
      });
    });

    applyLanguage(readSaved());

    // Coming back from /menu can restore this page from the back/forward cache
    // without running the script again; pick up the language chosen meanwhile.
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) applyLanguage(readSaved());
    });
  } catch (error) {
    console.error("site.js: language failed", error);
  }

  // ---- Lineup -------------------------------------------------------------
  // Fetches the nights from LINEUP_URL and draws one card per night of the next
  // LINEUP_DAYS days. With nothing on, or if loading fails, the "coming soon"
  // line shows instead; the rest of the page is unaffected either way. When
  // the manager turns the section off, it isn't in the page and nothing loads.
  try {
    const grid = document.querySelector("[data-lineup]");
    const empty = document.querySelector(".nights-empty");
    const labels = []; // { time, date } for redrawing dates on a language switch

    // The cards are styled in capitals, and in Turkish a capital "i" is "İ".
    // DJ names and music styles are mostly English ("Nicole", "Indie Dance"),
    // so they are marked English unless they use letters only Turkish has.
    function langOf(text) {
      return /[çğıöşüÇĞİÖŞÜ]/.test(text) ? "tr" : "en";
    }

    function make(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }

    // "Cuma · 28 Kasım" / "Friday · 28 Nov", or "Tonight · 28 Nov".
    function drawLabels() {
      const words = NIGHT_TEXT[document.documentElement.lang === "en" ? "en" : "tr"];
      const tonight = istanbulNightDate();
      labels.forEach(({ time, date }) => {
        const day = dayOf(date);
        const when = date === tonight ? words.tonight : words.days[day.getUTCDay()];
        time.textContent = `${when} · ${day.getUTCDate()} ${words.months[day.getUTCMonth()]}`;
      });
    }

    function card(night, index) {
      const wrap = make("div", "reveal");
      wrap.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 80}ms`);
      const article = make("article", "night-card inset-frame");

      const label = make("p", "micro-label");
      const time = make("time");
      time.dateTime = night.date;
      labels.push({ time, date: night.date });
      label.append(time);

      const name = make("h3", "night-dj", night.dj);
      name.lang = langOf(night.dj);
      article.append(label, name);

      if (night.genres.length) {
        const tags = make("ul", "tags");
        night.genres.forEach((genre) => {
          const tag = make("li", "tag", genre);
          tag.lang = langOf(genre);
          tags.append(tag);
        });
        article.append(tags);
      }

      article.append(make("p", "night-time", night.end ? `${night.start} – ${night.end}` : night.start));
      wrap.append(article);
      return wrap;
    }

    function show(nights) {
      const tonight = istanbulNightDate();
      const until = addDays(tonight, LINEUP_DAYS);
      const shown = nights.filter(
        (n) => n && typeof n.date === "string" && typeof n.dj === "string" && n.date >= tonight && n.date < until,
      );
      shown.forEach((n) => {
        n.genres = Array.isArray(n.genres) ? n.genres.filter((g) => typeof g === "string") : [];
        n.start = typeof n.start === "string" ? n.start : "";
        n.end = typeof n.end === "string" ? n.end : "";
      });
      grid.replaceChildren(...shown.map(card));
      grid.dataset.count = String(shown.length);
      drawLabels();
      grid.querySelectorAll(".reveal").forEach(revealOnScroll);
      if (empty) empty.hidden = shown.length > 0;
    }

    if (grid) {
      document.addEventListener("legy:language", drawLabels);

      const controller = "AbortController" in window ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 8000) : 0;
      fetch(LINEUP_URL, { headers: { Accept: "application/json" }, signal: controller ? controller.signal : undefined })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((data) => show(data && Array.isArray(data.nights) ? data.nights : []))
        .catch((error) => {
          console.error("site.js: lineup failed", error);
          show([]);
        })
        .finally(() => clearTimeout(timer));
    }
  } catch (error) {
    console.error("site.js: lineup failed", error);
  }

  // ---- Nav ----------------------------------------------------------------
  try {
    const nav = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");
    if (!nav) throw new Error("no .site-nav");
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
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      updateNav();
    }

    window.addEventListener("scroll", requestNavUpdate, { passive: true });
    if (toggle) toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    // Any link in the header (the logo too) closes the mobile panel.
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setOpen(false));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        if (toggle) toggle.focus();
      }
    });
    wide.addEventListener("change", () => {
      if (wide.matches) setOpen(false);
    });
    updateNav();
  } catch (error) {
    console.error("site.js: nav failed", error);
  }
})();
