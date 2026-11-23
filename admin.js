// The editor at /admin for the venue manager, in four tabs: the DJ lineup
// ("Program"), the venue details ("Bilgiler"), the signature cocktails
// ("Kokteyller") and the menu PDFs ("Menü"). Logs in with the admin password.
// Each tab saves to its own address: /api/lineup, /api/venue, /api/cocktails
// and /api/menu (functions/api).
(() => {
  "use strict";

  const PASSWORD_KEY = "legy-admin-password";
  // How many days ahead the landing page shows. Keep in step with LINEUP_DAYS in site.js.
  const SITE_DAYS = 7;
  const DEFAULT_START = "23:00";
  const DEFAULT_END = "04:00";
  const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  // KV's limit for one value; the server checks it too (functions/_lib/menu.js).
  const MAX_MENU_BYTES = 25 * 1024 * 1024;
  // Tab names in the address (#bilgiler), so a reload stays on the same tab.
  const TAB_HASH = { lineup: "program", venue: "bilgiler", cocktails: "kokteyller", menu: "menu" };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const loading = $("[data-loading]");
  const loginForm = $("[data-login]");
  const loginStatus = $("[data-login-status]");
  const passwordInput = $("#password");
  const tabBar = $("[data-tabs]");
  const panels = $$("[data-panel]");
  const logoutButton = $("[data-logout]");
  const foot = $("[data-foot]");
  const panel = (name) => $(`[data-panel="${name}"]`);

  let password = "";
  const unsaved = new Set(); // names of the tabs with unsaved changes

  // ---- Dates (same rules as site.js) ---------------------------------------

  // The date of the night that is on in Istanbul. Until 04:00 it is still the night before.
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

  function addDays(date, days) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function weekday(date) {
    return DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  }

  // "23 Kasım 14:05", Istanbul time.
  function formatStamp(iso) {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  // ---- Talking to the server ----------------------------------------------

  // body: an object (sent as JSON) or a file (sent as it is).
  async function call(method, path, body, headers = {}) {
    const init = {
      method,
      headers: { Authorization: `Bearer ${encodeURIComponent(password)}`, ...headers },
      cache: "no-store",
    };
    if (body instanceof Blob) {
      init.body = body;
    } else if (body) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetch(path, init);
    } catch {
      throw Object.assign(new Error("Bağlanılamadı. İnterneti kontrol edip tekrar deneyin."), { status: 0 });
    }
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Not JSON (an error page); the status code still says what happened.
    }
    if (!response.ok) {
      let message = (data && data.error) || `Sunucu hatası (${response.status}).`;
      if (response.status === 503) message = `Sistem henüz kurulmamış: ${message}`;
      throw Object.assign(new Error(message), { status: response.status });
    }
    return data || {};
  }

  // What to tell the manager when a save or upload fails. Their edits stay on
  // screen, so they can try again.
  function failure(error) {
    return error.status === 401 ? "Şifre değişmiş. Çıkış yapıp yeni şifreyle girin." : error.message;
  }

  function readPassword() {
    try {
      return localStorage.getItem(PASSWORD_KEY) || "";
    } catch {
      return "";
    }
  }

  function rememberPassword(value) {
    try {
      if (value) localStorage.setItem(PASSWORD_KEY, value);
      else localStorage.removeItem(PASSWORD_KEY);
    } catch {
      // Private mode: the manager types the password each time.
    }
  }

  // ---- Screens and tabs -----------------------------------------------------

  function showLogin(message) {
    loading.hidden = true;
    tabBar.hidden = true;
    panels.forEach((p) => {
      p.hidden = true;
    });
    foot.hidden = true;
    logoutButton.hidden = true;
    loginForm.hidden = false;
    loginStatus.textContent = message || "";
    passwordInput.value = "";
    passwordInput.focus();
  }

  function showEditor() {
    loading.hidden = true;
    loginForm.hidden = true;
    tabBar.hidden = false;
    foot.hidden = false;
    logoutButton.hidden = false;
    const fromHash = Object.keys(TAB_HASH).find((name) => TAB_HASH[name] === location.hash.slice(1));
    openTab(fromHash || "lineup");
  }

  function openTab(name) {
    $$("[data-tab]", tabBar).forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === name)));
    panels.forEach((p) => {
      p.hidden = p.dataset.panel !== name;
    });
    history.replaceState(null, "", `#${TAB_HASH[name]}`);
  }

  async function logIn(candidate, silent) {
    password = candidate;
    try {
      const [lineup, venue, cocktails, menus] = await Promise.all([
        call("GET", "/api/lineup"),
        call("GET", "/api/venue"),
        call("GET", "/api/cocktails"),
        call("GET", "/api/menu"),
      ]);
      rememberPassword(password);
      showLineup(lineup);
      showVenue(venue);
      showCocktails(cocktails);
      showMenus(menus);
      unsaved.clear();
      drawUnsaved();
      showEditor();
    } catch (error) {
      password = "";
      if (error.status === 401) {
        rememberPassword("");
        showLogin(silent ? "" : "Şifre yanlış.");
      } else {
        showLogin(error.message);
      }
    }
  }

  function setStatus(line, text, kind) {
    line.textContent = text;
    line.classList.toggle("is-ok", kind === "ok");
    line.classList.toggle("is-error", kind === "error");
  }

  const lastSaved = (data) => (data.updatedAt ? `Son kayıt: ${formatStamp(data.updatedAt)}` : "");

  function drawUnsaved() {
    $$("[data-tab]", tabBar).forEach((tab) => tab.classList.toggle("has-changes", unsaved.has(tab.dataset.tab)));
  }

  // A form tab: marks itself unsaved on any edit, and on "Kaydet" sends what
  // collect() returns to path, then shows what the server saved.
  function savable(form, { path, collect, check, show }) {
    const status = $("[data-status]", form);
    const button = $("[data-save]", form);
    let saving = false;

    function changed() {
      if (saving) return;
      unsaved.add(form.dataset.panel);
      drawUnsaved();
      setStatus(status, "Kaydedilmemiş değişiklikler var.");
    }

    form.addEventListener("input", changed);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (saving) return;
      // Points at the first empty required field.
      if (!form.reportValidity()) return;
      const problem = check && check();
      if (problem) {
        setStatus(status, problem, "error");
        return;
      }
      saving = true;
      button.disabled = true;
      setStatus(status, "Kaydediliyor…");
      try {
        show(await call("PUT", path, collect()));
        unsaved.delete(form.dataset.panel);
        drawUnsaved();
        setStatus(status, "Kaydedildi. Sitede bir dakika içinde görünür.", "ok");
      } catch (error) {
        setStatus(status, `Kaydedilemedi. ${failure(error)}`, "error");
      } finally {
        saving = false;
        button.disabled = false;
      }
    });
    return { changed, status };
  }

  const field = (root, name) => root.querySelector(`[name="${name}"]`);

  // Brings a newly added row into view, with the cursor in its first box.
  function reveal(row, focusName) {
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    field(row, focusName).focus({ preventScroll: true });
  }

  // ---- Program: the DJ lineup -------------------------------------------------

  const lineupForm = panel("lineup");
  const nightList = $("[data-nights]", lineupForm);
  const nightTemplate = $("[data-night]");
  const emptyNote = $("[data-empty]", lineupForm);
  const showSwitch = field(lineupForm, "show");
  const lineup = savable(lineupForm, {
    path: "/api/lineup",
    collect: () => ({
      hidden: !showSwitch.checked,
      nights: [...nightList.children].map((row) => ({
        date: field(row, "date").value,
        dj: field(row, "dj").value.trim(),
        genres: field(row, "genres")
          .value.split(",")
          .map((genre) => genre.trim())
          .filter(Boolean),
        start: field(row, "start").value,
        end: field(row, "end").value,
      })),
    }),
    show: showLineup,
  });

  function showLineup(data) {
    const nights = data.nights || [];
    showSwitch.checked = data.hidden !== true;
    nightList.replaceChildren();
    nights.forEach(addNight);
    emptyNote.hidden = nights.length > 0;
    setStatus(lineup.status, lastSaved(data));
  }

  function addNight(night) {
    const row = nightTemplate.content.firstElementChild.cloneNode(true);
    field(row, "date").value = night.date || "";
    field(row, "dj").value = night.dj || "";
    field(row, "genres").value = (night.genres || []).join(", ");
    field(row, "start").value = night.start || "";
    field(row, "end").value = night.end || "";
    nightList.append(row);
    describeDate(row);
    return row;
  }

  // Under the date: the weekday, and whether guests can see the night yet.
  function describeDate(row) {
    const date = field(row, "date").value;
    const when = $("[data-when]", row);
    if (!date) {
      when.textContent = "";
      return;
    }
    const tonight = istanbulNightDate();
    let text = date === tonight ? `${weekday(date)} · bu gece` : weekday(date);
    if (date < tonight) text += " · geçmiş, kaydedince silinir";
    else if (date >= addDays(tonight, SITE_DAYS)) text += " · sitede henüz görünmez (7 günden ileride)";
    when.textContent = text;
  }

  // The day after the last night (or tonight), with the same times.
  function newNight() {
    const rows = [...nightList.children];
    const last = rows[rows.length - 1];
    const tonight = istanbulNightDate();
    const lastDate = last ? field(last, "date").value : "";
    return {
      date: lastDate && lastDate >= tonight ? addDays(lastDate, 1) : tonight,
      dj: "",
      genres: [],
      start: (last && field(last, "start").value) || DEFAULT_START,
      end: last ? field(last, "end").value : DEFAULT_END,
    };
  }

  nightList.addEventListener("input", (event) => {
    if (event.target.name === "date") describeDate(event.target.closest(".item"));
  });

  nightList.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove]");
    if (!remove) return;
    remove.closest(".item").remove();
    emptyNote.hidden = nightList.children.length > 0;
    lineup.changed();
  });

  $("[data-add]", lineupForm).addEventListener("click", () => {
    const row = addNight(newNight());
    emptyNote.hidden = true;
    lineup.changed();
    reveal(row, "dj");
  });

  // ---- Bilgiler: the venue details --------------------------------------------

  const venueForm = panel("venue");
  const dayBoxes = $$('input[name="openDays"]', venueForm);
  const venue = savable(venueForm, {
    path: "/api/venue",
    check: () => (dayBoxes.some((box) => box.checked) ? "" : "En az bir açık gece seçin."),
    collect: () => ({
      venue: {
        whatsapp: field(venueForm, "whatsapp").value,
        address: field(venueForm, "address").value,
        mapsUrl: field(venueForm, "mapsUrl").value,
        mapEmbed: field(venueForm, "mapEmbed").value,
        openDays: dayBoxes.filter((box) => box.checked).map((box) => Number(box.value)),
        opens: field(venueForm, "opens").value,
        closes: field(venueForm, "closes").value,
        door: { tr: field(venueForm, "doorTr").value, en: field(venueForm, "doorEn").value },
      },
    }),
    show: showVenue,
  });

  function showVenue(data) {
    field(venueForm, "whatsapp").value = data.whatsapp || "";
    field(venueForm, "address").value = data.address || "";
    field(venueForm, "mapsUrl").value = data.mapsUrl || "";
    field(venueForm, "mapEmbed").value = data.mapEmbed || "";
    dayBoxes.forEach((box) => {
      box.checked = (data.openDays || []).includes(Number(box.value));
    });
    field(venueForm, "opens").value = data.opens || "";
    field(venueForm, "closes").value = data.closes || "";
    field(venueForm, "doorTr").value = (data.door && data.door.tr) || "";
    field(venueForm, "doorEn").value = (data.door && data.door.en) || "";
    setStatus(venue.status, lastSaved(data));
  }

  // ---- Kokteyller: the signature cocktails --------------------------------------

  const cocktailsForm = panel("cocktails");
  const cocktailList = $("[data-cocktails]", cocktailsForm);
  const cocktailTemplate = $("[data-cocktail]");
  const lines = (text) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  const cocktails = savable(cocktailsForm, {
    path: "/api/cocktails",
    check: () => (cocktailList.children.length ? "" : "En az bir kokteyl olmalı."),
    collect: () => ({
      items: [...cocktailList.children].map((row) => ({
        name: field(row, "name").value.trim(),
        ingredients: { tr: lines(field(row, "ingredientsTr").value), en: lines(field(row, "ingredientsEn").value) },
        price: readPrice(field(row, "price").value),
      })),
    }),
    show: showCocktails,
  });

  // "1300", "1.300" and "1.300 ₺" are all 1300. Anything else goes to the
  // server as typed, which explains what is wrong.
  function readPrice(text) {
    const typed = text.trim();
    if (!typed) return null;
    const digits = typed.replace(/[\s.₺]/g, "");
    return /^\d+$/.test(digits) ? Number(digits) : typed;
  }

  function showCocktails(data) {
    cocktailList.replaceChildren();
    (data.items || []).forEach(addCocktail);
    setStatus(cocktails.status, lastSaved(data));
  }

  function addCocktail(cocktail) {
    const row = cocktailTemplate.content.firstElementChild.cloneNode(true);
    const ingredients = cocktail.ingredients || {};
    field(row, "name").value = cocktail.name || "";
    field(row, "ingredientsTr").value = (ingredients.tr || []).join("\n");
    field(row, "ingredientsEn").value = (ingredients.en || []).join("\n");
    field(row, "price").value = cocktail.price == null ? "" : String(cocktail.price);
    cocktailList.append(row);
    return row;
  }

  cocktailList.addEventListener("click", (event) => {
    const row = event.target.closest(".item");
    if (event.target.closest("[data-remove]")) {
      row.remove();
      cocktails.changed();
    } else if (event.target.closest("[data-move-up]") && row.previousElementSibling) {
      cocktailList.insertBefore(row, row.previousElementSibling);
      cocktails.changed();
      row.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });

  $("[data-add]", cocktailsForm).addEventListener("click", () => {
    const row = addCocktail({});
    cocktails.changed();
    reveal(row, "name");
  });

  // ---- Menü: the menu PDFs ------------------------------------------------------

  const menuPanel = panel("menu");

  function showMenus(info) {
    $$("[data-menu]", menuPanel).forEach((card) => drawMenu(card, info[card.dataset.menu] || {}));
  }

  // current / previous: { updatedAt, size, name }, or null for the PDF that
  // came with the site.
  function drawMenu(card, { current, previous }) {
    $("[data-menu-now]", card).textContent = current
      ? `Şu an: ${describeFile(current)}`
      : "Şu an siteyle gelen menü gösteriliyor.";
    $("[data-menu-undo]", card).hidden = !current && !previous;
    $("[data-menu-before]", card).textContent = previous
      ? `Önceki: ${describeFile(previous)}`
      : "Önceki: siteyle gelen menü";
  }

  // "Yeni menü.pdf · 23 Kasım 14:05 · 3,1 MB"
  function describeFile(file) {
    const size = file.size
      ? `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(file.size / 1024 / 1024)} MB`
      : "";
    return [file.name, file.updatedAt && formatStamp(file.updatedAt), size].filter(Boolean).join(" · ");
  }

  // Runs an upload or undo for one card, with its buttons off meanwhile.
  async function menuAction(card, working, request, done) {
    if (card.getAttribute("aria-busy") === "true") return;
    const status = $("[data-status]", card);
    const controls = $$("[data-menu-file], [data-menu-restore]", card);
    card.setAttribute("aria-busy", "true");
    controls.forEach((control) => {
      control.disabled = true;
    });
    setStatus(status, working);
    try {
      drawMenu(card, await request());
      setStatus(status, done, "ok");
    } catch (error) {
      setStatus(status, `Olmadı. ${failure(error)}`, "error");
    } finally {
      card.removeAttribute("aria-busy");
      controls.forEach((control) => {
        control.disabled = false;
      });
    }
  }

  menuPanel.addEventListener("change", (event) => {
    const input = event.target.closest("[data-menu-file]");
    if (!input) return;
    const card = input.closest("[data-menu]");
    const file = input.files[0];
    input.value = ""; // so picking the same file again still counts
    if (!file) return;
    const status = $("[data-status]", card);
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setStatus(status, "Bu dosya PDF değil.", "error");
      return;
    }
    if (file.size > MAX_MENU_BYTES) {
      setStatus(status, "PDF çok büyük. En fazla 25 MB olabilir.", "error");
      return;
    }
    menuAction(
      card,
      "Yükleniyor…",
      () =>
        call("PUT", `/api/menu/${card.dataset.menu}`, file, {
          "Content-Type": "application/pdf",
          "X-File-Name": encodeURIComponent(file.name),
        }),
      "Yüklendi. Misafirler bir dakika içinde yeni menüyü görür.",
    );
  });

  menuPanel.addEventListener("click", (event) => {
    if (!event.target.closest("[data-menu-restore]")) return;
    const card = event.target.closest("[data-menu]");
    menuAction(
      card,
      "Geri alınıyor…",
      () => call("POST", `/api/menu/${card.dataset.menu}`),
      "Önceki menüye dönüldü. Misafirler bir dakika içinde bunu görür.",
    );
  });

  // ---- Log in and out ------------------------------------------------------

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginStatus.textContent = "";
    logIn(passwordInput.value, false);
  });

  logoutButton.addEventListener("click", () => {
    if (unsaved.size && !window.confirm("Kaydedilmemiş değişiklikler silinsin mi?")) return;
    password = "";
    unsaved.clear();
    drawUnsaved();
    rememberPassword("");
    showLogin("");
  });

  tabBar.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (!tab) return;
    openTab(tab.dataset.tab);
    window.scrollTo({ top: 0 });
  });

  window.addEventListener("beforeunload", (event) => {
    if (!unsaved.size) return;
    event.preventDefault();
    event.returnValue = "";
  });

  // ---- Start ----------------------------------------------------------------

  const saved = readPassword();
  if (saved) logIn(saved, true);
  else showLogin("");
})();
