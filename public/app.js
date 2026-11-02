(() => {
"use strict";
// ================= helpers =================
const $ = (s, r = document) => r.querySelector(s);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") { for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith("--")) el.style.setProperty(sk, sv); else el.style[sk] = sv; } }
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(9)) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const svg = d => { const s = document.createElement("span"); s.style.display = "contents"; s.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`; return s.firstChild; };
const I = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="3"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-width="2.6"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 11v6M12 7.5v.01" stroke-width="2.2"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 5l-7 7 7 7" stroke-width="2.4"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  today: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/>',
  tray: '<path d="M4 13l2.5-7.5h11L20 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M4 13h4.5l1 2h5l1-2H20"/>',
  done: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  more: '<circle cx="12" cy="12" r="9.2"/><circle cx="8" cy="12" r=".6" fill="currentColor"/><circle cx="12" cy="12" r=".6" fill="currentColor"/><circle cx="16" cy="12" r=".6" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  note: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  expand: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
  shrink: '<path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
const icon = n => svg(I[n]);
const COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#5ac8fa", "#007aff", "#5856d6", "#af52de", "#ff2d55", "#a2845e", "#8e8e93", "#30b0c7"];
const EMOJIS = ["📋", "💬", "💼", "🚗", "🏠", "💶", "🧾", "📞", "🛒", "🔧", "📦", "🏥", "🎓", "✈️", "🎁", "💡", "⭐️", "📅", "🗂️", "🐶", "🏋️", "🍽️", "🧑‍💻", "📈", "❤️"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, "0");
const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + "T12:00"); d.setDate(d.getDate() + n); return iso(d); };
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function dayLabel(s, long) {
  const t = today();
  if (s === t) return "Oggi"; if (s === addDays(t, 1)) return "Domani"; if (s === addDays(t, -1)) return "Ieri";
  const d = new Date(s + "T12:00");
  const base = (long ? GIORNI[d.getDay()] + " " : "") + d.getDate() + " " + (long ? MESI[d.getMonth()] : MESI[d.getMonth()].slice(0, 3));
  return d.getFullYear() !== new Date().getFullYear() ? base + " " + d.getFullYear() : base;
}
const REMIND = { none: "Nessuno", morning: "Il giorno stesso alle 9", at: "All'ora della scadenza", "15m": "15 minuti prima", "1h": "1 ora prima", "1d": "Il giorno prima" };
const PRIO = ["", "Bassa", "Media", "Alta"];
const REPEAT = { "": "Mai", daily: "Ogni giorno", weekly: "Ogni settimana", monthly: "Ogni mese", yearly: "Ogni anno" };
const FS_EL = document.documentElement;
const FS_OK = !!(FS_EL.requestFullscreen || FS_EL.webkitRequestFullscreen) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFs() {
  try {
    if (isFs()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (FS_EL.requestFullscreen || FS_EL.webkitRequestFullscreen).call(FS_EL);
  } catch (_) {}
}
["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => { const b = $(".fs-btn"); if (b) { b.title = isFs() ? "Esci da schermo intero" : "Schermo intero"; b.replaceChildren(icon(isFs() ? "shrink" : "expand")); } }));
function applyTheme() {
  const t = lsGet("theme", "auto"), root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (!m.dataset.o) m.dataset.o = m.content; m.content = t === "auto" ? m.dataset.o : (t === "dark" ? "#191919" : "#fbfbfa"); });
}
const isMobile = () => matchMedia("(max-width: 799px)").matches;

// ================= state =================
const LS = "organize:";
let items = {};          // id -> item
let synced = {};         // id -> JSON string last confirmed by server
let route = { v: "home" };
let showDone = false;
const recentDone = new Set();
let focusReq = null;     // {id, sel:'t'|'add', at:'end'}
let addingUnder = null;  // id whose child add-row is open
let searchQ = "";
let searchOpen = false;  // Mac: il campo di ricerca appare solo dopo aver toccato la lente
let syncState = "ok";

const lsGet = (k, d) => { try { const v = localStorage.getItem(LS + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (_) {} };

// ================= tree helpers =================
const kids = p => Object.values(items).filter(x => x.parent === p).sort((a, b) => a.ord - b.ord || (a.id < b.id ? -1 : 1));
const cats = () => kids("");
const desc = id => { const out = []; const w = x => kids(x).forEach(k => { out.push(k.id); w(k.id); }); w(id); return out; };
const catOf = id => { let c = items[id]; for (let i = 0; c && c.parent && i < 50; i++) c = items[c.parent]; return c; };
const colorOf = id => (catOf(id) || {}).color || COLORS[5];
const pathOf = id => { const out = []; let p = items[id] && items[id].parent; for (let i = 0; p && items[p] && i < 50; i++) { out.unshift(items[p].text); p = items[p].parent; } return out.join(" › "); };
const nextOrd = p => { const k = kids(p); return k.length ? k[k.length - 1].ord + 1 : 1; };
const visible = it => showDone || !it.done || recentDone.has(it.id);
const openCount = id => desc(id).filter(k => !items[k].done).length;

// ================= api / sync =================
async function api(path, body) {
  const r = await fetch(path, body === undefined ? { credentials: "same-origin" } : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !path.includes("login") && !path.includes("setup")) { showAuth(false); throw new Error("auth"); }
  if (!r.ok) throw new Error(data.error || "Errore");
  return data;
}
const norm = it => JSON.stringify(it);
function pending() {
  const up = [], del = [];
  for (const [id, it] of Object.entries(items)) if (synced[id] !== norm(it)) up.push(it);
  for (const id of Object.keys(synced)) if (!items[id]) del.push(id);
  return { up, del };
}
let syncTimer = null, syncing = false;
function scheduleSync(ms = 500) { clearTimeout(syncTimer); syncTimer = setTimeout(doSync, ms); }
async function doSync() {
  if (syncing) { scheduleSync(300); return; }
  const { up, del } = pending();
  if (!up.length && !del.length) { setSync("ok"); return; }
  syncing = true;
  const sent = up.map(it => [it.id, norm(it)]);
  try {
    await api("/api/sync", { upsert: up, delete: del });
    for (const [id, s] of sent) synced[id] = s;
    for (const id of del) delete synced[id];
    lsSet("synced", synced);
    setSync(pending().up.length || pending().del.length ? "busy" : "ok");
  } catch (e) {
    setSync("err"); if (e.message !== "auth") scheduleSync(5000);
  } finally { syncing = false; }
}
function setSync(s) { syncState = s; const d = $("#syncDot"); if (d) { d.className = "sync-dot" + (s === "err" ? " err" : ""); d.title = s === "err" ? "Non sincronizzato, riprovo…" : "Sincronizzato"; } }
async function pull() {
  const { up, del } = pending();
  if (up.length || del.length) { await doSync(); if (pending().up.length) return; }
  const data = await api("/api/items");
  const next = {}; const nextSynced = {};
  for (const r of data.items) {
    const it = { id: r.id, parent: r.parent || "", text: r.text, ord: r.ord, done: !!r.done, collapsed: !!r.collapsed, due_date: r.due_date, due_time: r.due_time, remind: r.remind, repeat: r.repeat, notes: r.notes, color: r.color, icon: r.icon, priority: r.priority || 0 };
    next[r.id] = it; nextSynced[r.id] = norm(it);
  }
  const same = norm(next) === norm(items);
  items = next; synced = nextSynced; saveLocal();
  if (!same && (!document.activeElement || !document.activeElement.isContentEditable && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA")) render();
}
function saveLocal() { lsSet("items", items); lsSet("synced", synced); }
function commit(rerender = true) { saveLocal(); if (rerender) render(); scheduleSync(); }

function mkItem(parent, text, extra) {
  const it = { id: uid(), parent, text, ord: nextOrd(parent), done: false, collapsed: false, due_date: null, due_time: null, remind: null, repeat: null, notes: null, color: null, icon: null, priority: 0, ...extra };
  items[it.id] = it; return it;
}
function removeItem(id) { desc(id).concat(id).forEach(k => delete items[k]); }
function advance(it) {
  const t = today(); let d = it.due_date;
  const step = s => { const x = new Date(s + "T12:00");
    if (it.repeat === "daily") x.setDate(x.getDate() + 1);
    else if (it.repeat === "weekly") x.setDate(x.getDate() + 7);
    else if (it.repeat === "monthly") { const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + 1); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); }
    else if (it.repeat === "yearly") x.setFullYear(x.getFullYear() + 1);
    return iso(x); };
  d = step(d); for (let i = 0; i < 400 && d < t; i++) d = step(d);
  it.due_date = d;
}
function toggleDone(id) {
  const it = items[id];
  if (!it.done && it.repeat && it.due_date) { advance(it); toast("Fatto ✓ Prossima volta: " + dayLabel(it.due_date, true)); commit(); return; }
  it.done = !it.done;
  if (it.done) { recentDone.add(id); setTimeout(() => { recentDone.delete(id); if (!showDone) render(); }, 1400); }
  commit();
}

// ================= routing =================
function parseHash() {
  const h = location.hash.slice(1);
  if (h === "today" || h === "scheduled" || h === "all" || h === "done") return { v: h };
  if (h.startsWith("c-") && items[h.slice(2)]) return { v: "cat", id: h.slice(2) };
  if (h.startsWith("i-") && items[h.slice(2)]) { const c = catOf(h.slice(2)); return { v: "cat", id: c.id, hl: h.slice(2) }; }
  return { v: isMobile() ? "home" : "today" };
}
function go(h) { if (location.hash === "#" + h) { route = parseHash(); render(); } else location.hash = h; }
window.addEventListener("hashchange", () => { route = parseHash(); searchQ = ""; searchOpen = false; addingUnder = null; render(); const m = $(".main"); if (m) m.scrollTop = 0; });

// ================= render =================
function render() {
  const app = $("#app");
  const inList = route.v !== "home" || !!searchQ;
  const side = renderSide(), main = renderMain();
  const prevSide = $(".side-scroll"), keep = prevSide ? prevSide.scrollTop : 0;
  const prevMain = $(".main"), keepM = prevMain ? prevMain.scrollTop : 0;
  app.replaceChildren(h("div", { class: "layout" + (inList ? " in-list" : "") }, side, main));
  $(".side-scroll").scrollTop = keep; $(".main").scrollTop = keepM;
  if (focusReq) {
    const f = focusReq; focusReq = null;
    const el = f.sel === "add" ? $(`[data-add="${f.id}"]`) : $(`li[data-id="${f.id}"] > .row .t`);
    if (el) { el.focus(); if (el.isContentEditable) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(f.at !== "start"); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  }
  if (route.hl) { const el = $(`li[data-id="${route.hl}"] > .row`); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("hl"); } route.hl = null; }
}

function counts() {
  const t = today(); let td = 0, sc = 0, all = 0, dn = 0;
  for (const it of Object.values(items)) {
    if (!it.parent) continue;
    if (it.done) { dn++; continue; }
    all++;
    if (it.due_date) { sc++; if (it.due_date <= t) td++; }
  }
  return { td, sc, all, dn };
}

// numeri delle tre pillole (Oggi / Fatte / Scadute), usati nella barra laterale e nel titolo di Oggi
function dayStats() {
  const t = today(), dated = Object.values(items).filter(x => x.parent && x.due_date);
  return {
    open: dated.filter(x => x.due_date === t && !x.done).length,
    done: dated.filter(x => x.due_date === t && x.done).length,
    late: dated.filter(x => x.due_date < t && !x.done && visible(x)).length,
  };
}
function setSearchOpen(on) {
  searchOpen = on;
  const s = $(".side .search"), b = $(".search-btn");
  if (s) s.classList.toggle("open", on || !!searchQ);
  if (b) b.classList.toggle("on", on || !!searchQ);
  if (on && s) { const i = s.querySelector("input"); if (i) i.focus(); }
}
document.addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && $(".side .search")) { e.preventDefault(); setSearchOpen(true); } });

function renderSide() {
  const c = counts(), st = dayStats();
  const spill = (cls, n, label, on, fn) => h("button", { class: "sp" + (cls ? " " + cls : "") + (n ? "" : " zero") + (on ? " on" : ""), onclick: fn }, h("b", null, n), h("span", null, label));
  const pillsBar = h("div", { class: "side-pills" },
    spill("", st.open, "oggi", route.v === "today" && !searchQ, () => { searchQ = ""; go("today"); }),
    spill("green", st.done, st.done === 1 ? "fatta" : "fatte", route.v === "done" && !searchQ, () => { searchQ = ""; go("done"); }),
    spill("red", st.late, st.late === 1 ? "scaduta" : "scadute", false, () => { searchQ = ""; go("today"); }));
  const tile = (v, label, n, color, ic) => h("button", { class: "tile" + (route.v === v && !searchQ ? " on" : ""), onclick: () => { searchQ = ""; go(v); } },
    h("span", { class: "dot" }, icon(ic)), h("span", { class: "n" }, n || ""), h("span", { class: "l" }, label));
  const catList = cats().map(cat => h("button", {
      class: "cat" + (route.v === "cat" && route.id === cat.id && !searchQ ? " on" : ""), onclick: () => { searchQ = ""; go("c-" + cat.id); },
    },
    h("span", { class: "ico", style: { "--c": cat.color || COLORS[5] } }, cat.icon || icon("list")),
    h("span", { class: "nm" }, cat.text), h("span", { class: "ct" }, openCount(cat.id) || ""), h("span", { class: "chev" }, icon("chev"))));
  return h("aside", { class: "side" },
    h("div", { class: "side-scroll" },
      h("div", { class: "side-head" }, h("button", { class: "brand", title: "Pagina principale", onclick: () => { searchQ = ""; selDay = today(); wkStart = today(); go(isMobile() ? "home" : "today"); } }, h("img", { class: "b-tile", src: "/logo-tile.png", alt: "" }), h("img", { class: "wm", src: "/logo-organize.png", alt: "Organize" })), h("span", { class: "head-btns" }, h("button", { class: "icon-btn search-btn" + (searchOpen || searchQ ? " on" : ""), title: "Cerca (⌘K)", onmousedown: e => e.preventDefault(), onclick: () => setSearchOpen(!(searchOpen && !searchQ)) }, icon("search")), FS_OK ? h("button", { class: "icon-btn fs-btn", title: isFs() ? "Esci da schermo intero" : "Schermo intero", onclick: toggleFs }, icon(isFs() ? "shrink" : "expand")) : null, h("button", { class: "icon-btn", title: "Impostazioni", onclick: openSettings }, icon("gear")))),
      h("label", { class: "search" + (searchOpen || searchQ ? " open" : "") }, icon("search"), h("input", {
        type: "search", placeholder: "Cerca", value: searchQ,
        oninput: e => { searchQ = e.target.value; renderMainOnly(); const l = $(".layout"); l.classList.toggle("in-list", !!searchQ || route.v !== "home"); },
        onkeydown: e => { if (e.key === "Escape") { e.target.value = ""; searchQ = ""; renderMainOnly(); $(".layout").classList.toggle("in-list", route.v !== "home"); setSearchOpen(false); e.target.blur(); } },
        onblur: () => { if (!searchQ) setSearchOpen(false); } })),
      pillsBar,
      h("div", { class: "tiles" },
        tile("today", "Oggi", c.td, "var(--blue)", "today"),
        tile("scheduled", "Programmati", c.sc, "var(--red)", "cal"),
        tile("all", "Tutti", c.all, "#5b5b60", "tray"),
        tile("done", "Completati", c.dn, "#8e8e93", "done")),
      h("div", { class: "sec-title" }, "Le mie categorie"),
      catList.length ? h("div", { class: "cats" }, catList) : h("div", { class: "empty", style: { padding: "20px" } }, "Nessuna categoria ancora")),
    h("div", { class: "side-foot" },
      h("button", { class: "link-btn", onclick: () => openCategory(null) }, icon("plus"), "Nuova categoria"),
      h("span", { id: "syncDot", class: "sync-dot" + (syncState === "err" ? " err" : "") })));
}
function renderMainOnly() { const m = $(".main"); if (m) m.replaceWith(renderMain()); }

function renderMain() {
  const inner = h("div", { class: "main-inner" + (route.v === "today" && !searchQ ? " wide" : "") });
  const top = h("div", { class: "topbar" }, h("button", { class: "back", onclick: () => { searchQ = ""; go("home"); } }, icon("back"), "Organize"));
  inner.append(top);
  if (searchQ) { renderSearch(inner); return h("main", { class: "main" }, inner); }
  const v = route.v;
  if (v === "cat") renderCat(inner, top);
  else if (v === "today") renderToday(inner);
  else if (v === "scheduled") renderScheduled(inner);
  else if (v === "all") renderAll(inner);
  else if (v === "done") renderDoneView(inner);
  return h("main", { class: "main" }, inner);
}

function itemList(list, opts = {}) {
  const ul = h("ul", { class: "items" });
  list.filter(visible).forEach(it => ul.append(itemNode(it, opts)));
  return ul;
}
function itemNode(it, opts) {
  const color = colorOf(it.id);
  const ch = kids(it.id), chVis = ch.filter(visible);
  const li = h("li", { "data-id": it.id, class: (it.done ? "done" : "") + (it.done && recentDone.has(it.id) ? " just" : ""), style: { "--c": color } });
  const t = today();
  const meta = [];
  if (it.due_date) {
    const late = !it.done && it.due_date < t, isT = it.due_date === t;
    meta.push(h("span", { class: late ? "late" : isT ? "today" : "" }, dayLabel(it.due_date) + (it.due_time ? ", " + it.due_time : "")));
  }
  if (it.priority) meta.push(h("span", { class: "prio p" + it.priority }, PRIO[it.priority]));
  if (it.repeat) meta.push(h("span", null, icon("repeat")));
  if (it.remind && it.remind !== "none" && it.due_date) meta.push(h("span", null, icon("bell")));
  if (it.notes) meta.push(h("span", { class: "notes" }, icon("note"), " ", it.notes.split("\n")[0].slice(0, 60)));
  if (opts.path) { const p = pathOf(it.id); if (p) meta.push(h("span", { class: "path" }, p)); }

  const tEl = h("span", { class: "t", contenteditable: "true", spellcheck: "true", "data-ph": "Nuovo promemoria", enterkeyhint: "next" }, it.text);
  tEl.addEventListener("input", () => { it.text = tEl.innerText.replace(/\n/g, " "); saveLocal(); scheduleSync(800); });
  tEl.addEventListener("keydown", e => onItemKey(e, it, opts, tEl));
  tEl.addEventListener("blur", () => {
    const v = tEl.innerText.replace(/\s+/g, " ").trim();
    setTimeout(() => {
      if (!items[it.id]) return;
      if (!v && !ch.length && !it.notes && !it.due_date) { removeItem(it.id); commit(document.activeElement === document.body || !document.activeElement.isContentEditable); return; }
      if (v !== it.text) { it.text = v; commit(false); }
    }, 0);
  });

  const act = h("span", { class: "row-act" });
  if (ch.length && !opts.flat) act.append(h("button", { class: "kids" + (it.collapsed ? "" : " open"), title: it.collapsed ? "Espandi" : "Comprimi", onclick: () => { it.collapsed = !it.collapsed; commit(); } }, String(ch.filter(x => !x.done).length || "✓"), icon("chev")));
  if (!opts.flat) act.append(h("button", { class: "hov", title: "Aggiungi sotto-voce", onclick: () => { addingUnder = it.id; it.collapsed = false; focusReq = { id: it.id, sel: "add" }; render(); } }, icon("plus")));
  act.append(h("button", { class: "info hov", title: "Dettagli", onclick: () => openItem(it.id) }, icon("info")));

  li.append(h("div", { class: "row" },
    h("button", { class: "check", "aria-label": it.done ? "Segna da fare" : "Segna fatto", onclick: () => toggleDone(it.id) }, icon("check")),
    h("div", { class: "body" }, h("div", { class: "txt" }, tEl, meta.length ? h("div", { class: "meta" }, meta) : null), act)));

  if (!opts.flat && !it.collapsed && (chVis.length || addingUnder === it.id)) {
    const sub = itemList(ch, opts);
    if (addingUnder === it.id) sub.append(addRow(it.id, "Nuova sotto-voce"));
    li.append(sub);
  }
  return li;
}
function onItemKey(e, it, opts, tEl) {
  if (e.isComposing) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    it.text = tEl.innerText.replace(/\s+/g, " ").trim();
    if (!it.text) { tEl.blur(); return; }
    if (opts.flat) { tEl.blur(); return; }
    // new sibling right after
    const sib = kids(it.parent); const i = sib.findIndex(x => x.id === it.id);
    const nextOrdV = i < sib.length - 1 ? (it.ord + sib[i + 1].ord) / 2 : it.ord + 1;
    const n = mkItem(it.parent, "", { ord: nextOrdV });
    focusReq = { id: n.id }; commit();
  } else if (e.key === "Tab" && !opts.flat) {
    e.preventDefault();
    it.text = tEl.innerText.replace(/\s+/g, " ").trim();
    if (e.shiftKey) outdent(it.id); else indent(it.id);
    focusReq = { id: it.id }; commit();
  } else if (e.key === "Backspace" && !tEl.innerText.length && !kids(it.id).length) {
    e.preventDefault();
    const sib = kids(it.parent).filter(visible); const i = sib.findIndex(x => x.id === it.id);
    const prev = i > 0 ? sib[i - 1] : (it.parent && items[it.parent] && items[it.parent].parent ? items[it.parent] : null);
    removeItem(it.id); if (prev) focusReq = { id: prev.id }; commit();
  } else if (e.key === "Escape") tEl.blur();
}
function indent(id) {
  const it = items[id]; const sib = kids(it.parent); const i = sib.findIndex(x => x.id === id);
  if (i <= 0) return; const np = sib[i - 1];
  it.parent = np.id; it.ord = nextOrd(np.id); np.collapsed = false;
}
function outdent(id) {
  const it = items[id]; const p = items[it.parent]; if (!p || !p.parent) return; // categories are the top level
  const gsib = kids(p.parent); const i = gsib.findIndex(x => x.id === p.id);
  it.ord = i < gsib.length - 1 ? (p.ord + gsib[i + 1].ord) / 2 : p.ord + 1; it.parent = p.parent;
}
function addRow(parent, ph, extra) {
  const inp = h("input", { type: "text", placeholder: ph, "data-add": parent, enterkeyhint: "done" });
  const submit = () => {
    const v = inp.value.trim(); if (!v) { inp.focus(); return; }
    const target = typeof extra === "function" ? extra() : { parent, extra: {} };
    const n = mkItem(target.parent, v, target.extra); if (extra) toast("Aggiunto in " + (pathOf(n.id) || "categoria"));
    focusReq = { id: parent, sel: "add" }; commit();
  };
  inp.addEventListener("keydown", e => {
    if (e.isComposing) return;
    if (e.key === "Enter") { e.preventDefault(); if (!inp.value.trim()) { addingUnder = null; render(); return; } submit(); }
    if (e.key === "Escape") { addingUnder = null; render(); }
  });
  inp.addEventListener("blur", () => { if (!inp.value.trim() && addingUnder === parent) setTimeout(() => { if (addingUnder === parent && !document.activeElement.matches("[data-add]")) { addingUnder = null; render(); } }, 150); });
  const ok = extra ? h("button", { class: "add-ok", title: "Salva", onmousedown: e => e.preventDefault(), onclick: submit }, icon("check")) : null;
  return h("li", null, h("label", { class: "add-row" }, h("button", { class: "plus", type: "button", title: "Nuovo", onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); inp.value.trim() ? submit() : inp.focus(); } }, icon("plus")), inp, ok));
}

// ---------- views ----------
const panel = (list, color) => h("div", { class: "panel", style: color ? { "--c": color } : null }, list);
const greeting = () => { const hr = new Date().getHours(); return hr < 5 ? "Buonanotte" : hr < 13 ? "Buongiorno" : hr < 18 ? "Buon pomeriggio" : "Buonasera"; };
const byDue = (a, b) => (a.due_date + (a.due_time || "99")).localeCompare(b.due_date + (b.due_time || "99")) || (b.priority || 0) - (a.priority || 0);
function renderCat(inner, top) {
  const cat = items[route.id]; const col = cat.color || COLORS[5];
  top.append(h("button", { class: "icon-btn", title: "Opzioni", onclick: () => catMenu(cat.id) }, icon("more")));
  inner.append(h("div", { class: "page-ico", style: { "--c": col } }, cat.icon || "•"), h("div", { class: "big-title" }, cat.text));
  const n = openCount(cat.id);
  inner.append(h("p", { class: "page-sub" }, n ? n + (n === 1 ? " promemoria da fare" : " promemoria da fare") : "Niente da fare qui"));
  const list = itemList(kids(cat.id), {});
  list.append(addRow(cat.id, "Nuovo promemoria"));
  inner.append(panel(list, col));
  if (!kids(cat.id).length) inner.append(h("div", { class: "empty" }, "Scrivi qui sopra e premi Invio.", h("br"), "Con ", h("b", null, "+"), " aggiungi sotto-voci, con ", h("b", null, "ⓘ"), " scadenze e avvisi."));
}
function ensureInbox() {
  const all = cats(); const lastCat = lsGet("quickCat", null) || lsGet("lastCat", null);
  if (lastCat && items[lastCat] && !items[lastCat].parent) return lastCat;
  if (all.length) return all[0].id;
  const c = mkItem("", "Promemoria", { color: COLORS[5], icon: "📋" }); return c.id;
}
let selDay = null, wkStart = null;
const DOW = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const ROW = 52, DUR = 48;
const mins = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const hhmm = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
function hourRange(list) {
  let s = 8, e = 20;
  for (const it of list) if (it.due_time) { const hr = +it.due_time.slice(0, 2); s = Math.min(s, hr); e = Math.max(e, hr + 2); }
  return [Math.max(0, s), Math.min(24, e)];
}
function layoutDay(list) {
  const evs = list.filter(x => x.due_time).map(it => ({ it, start: mins(it.due_time), end: mins(it.due_time) + DUR })).sort((a, b) => a.start - b.start);
  const out = []; let cl = [], clEnd = -1;
  const flush = () => { if (!cl.length) return; const lanes = []; cl.forEach(ev => { let l = lanes.findIndex(x => x <= ev.start); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = ev.end; ev.lane = l; }); cl.forEach(ev => ev.lanes = lanes.length); out.push(...cl); cl = []; };
  evs.forEach(ev => { if (cl.length && ev.start >= clEnd) flush(); clEnd = cl.length ? Math.max(clEnd, ev.end) : ev.end; cl.push(ev); });
  flush(); return out;
}
function moveItem(id, day, time) {
  const it = items[id]; if (!it) return;
  if (it.due_date === day && (time === undefined || it.due_time === time)) return;
  it.due_date = day; if (time !== undefined) it.due_time = time; selDay = day;
  toast("Spostato a " + dayLabel(day, true) + (time ? ", " + time : "")); commit();
}
function dayParts(d, dated, s0, e0, idx) {
  const t = today();
  const list = dated.filter(x => x.due_date === d).sort(byDue);
  const late = d === t ? dated.filter(x => x.due_date < t && !x.done).sort(byDue) : [];
  const cls = (d === selDay ? " sel" : "") + (d === t ? " today" : "") + (d < t ? " past" : "") + (idx % 2 ? " alt" : "") + (idx > 0 ? " vl" : "");
  const colorOfIt = it => { const cat = catOf(it.id); return (cat && cat.color) || COLORS[5]; };
  const iconOfIt = it => { const cat = catOf(it.id); return (cat && cat.icon) || ""; };
  const dnd = (el, getTime) => {
    el.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", el.dataset.id); e.dataTransfer.effectAllowed = "move"; });
  };
  const head = h("button", { class: "wk-h" + cls, onclick: () => { selDay = d; render(); } },
    h("span", { class: "wk-dow" }, DOW[(new Date(d + "T12:00").getDay() + 6) % 7]), h("span", { class: "wk-num" }, String(+d.slice(8))));
  const noTime = list.filter(x => !x.due_time);
  const small = [...late.map(it => ({ it, late: true })), ...noTime.map(it => ({ it }))];
  const allday = h("div", { class: "wk-allday" + cls },
    small.slice(0, 3).map(({ it, late: isLate }) => { const b = h("button", { class: "wk-chip" + (it.done ? " done" : "") + (isLate ? " late" : ""), style: { "--c": colorOfIt(it) }, draggable: "true", "data-id": it.id, title: isLate ? it.text + " · scaduta il " + dayLabel(it.due_date, true) : it.text, onclick: () => openItem(it.id) }, h("span", { class: "wk-ic" }, iconOfIt(it)), h("span", { class: "wk-tx" }, it.text)); dnd(b); return b; }),
    small.length > 3 ? h("button", { class: "wk-more", onclick: () => { selDay = d; render(); } }, "+" + (small.length - 3)) : null);
  allday.addEventListener("dragover", e => { e.preventDefault(); allday.classList.add("drop"); });
  allday.addEventListener("dragleave", () => allday.classList.remove("drop"));
  allday.addEventListener("drop", e => { e.preventDefault(); allday.classList.remove("drop"); moveItem(e.dataTransfer.getData("text/plain"), d, null); });
  const col = h("div", { class: "tl-col" + cls, style: { height: (e0 - s0) * ROW + "px" } });
  layoutDay(list).forEach(ev => {
    const it = ev.it;
    const b = h("button", { class: "tl-ev" + (it.done ? " done" : ""), draggable: "true", "data-id": it.id, title: it.text + " · " + it.due_time, style: {
      "--c": colorOfIt(it), top: ((ev.start / 60 - s0) * ROW + 1) + "px", height: (DUR / 60 * ROW - 2) + "px",
      left: `calc(${ev.lane / ev.lanes * 100}% + 2px)`, width: `calc(${100 / ev.lanes}% - 4px)` }, onclick: () => openItem(it.id) },
      h("span", { class: "wk-tm" }, it.due_time), " ", iconOfIt(it) ? iconOfIt(it) + " " : "", it.text);
    dnd(b); col.append(b);
  });
  col.addEventListener("dblclick", e => {
    if (e.target.closest(".tl-ev")) return;
    const y = e.clientY - col.getBoundingClientRect().top;
    newAt(d, hhmm(Math.max(0, Math.min(23 * 60 + 30, Math.floor(((y / ROW + s0) * 60) / 30) * 30))));
  });
  allday.addEventListener("dblclick", e => { if (!e.target.closest("button")) newAt(d, null); });
  if (d === t) { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); if (m / 60 >= s0 && m / 60 <= e0) col.append(h("div", { class: "tl-now", style: { top: ((m / 60 - s0) * ROW) + "px" } })); }
  col.addEventListener("dragover", e => { e.preventDefault(); col.classList.add("drop"); });
  col.addEventListener("dragleave", () => col.classList.remove("drop"));
  col.addEventListener("drop", e => {
    e.preventDefault(); col.classList.remove("drop");
    const y = e.clientY - col.getBoundingClientRect().top;
    const m = Math.max(0, Math.min(23 * 60 + 45, Math.round(((y / ROW + s0) * 60) / 15) * 15));
    moveItem(e.dataTransfer.getData("text/plain"), d, hhmm(m));
  });
  return { head, allday, col, count: list.filter(x => !x.done).length + late.length, total: list.length + late.length };
}
function newAt(date, time) {   // doppio clic sulla settimana: scheda per un nuovo promemoria, creato solo con Conferma
  const it = { id: uid(), parent: ensureInbox(), text: "", ord: 0, done: false, collapsed: false, due_date: date, due_time: time, remind: time ? "15m" : "morning", repeat: null, notes: null, color: null, icon: null, priority: 0 };
  it.ord = nextOrd(it.parent); openItem(it.id, { draft: it });
}
function axis(s0, e0) {
  const a = h("div", { class: "tl-axis", style: { height: (e0 - s0) * ROW + "px" } });
  for (let hr = s0; hr < e0; hr++) a.append(h("span", { style: { top: (hr - s0) * ROW + "px" } }, pad(hr)));
  return a;
}
function weekBoard(dated) {
  const t = today(); if (!selDay) selDay = t; if (!wkStart) wkStart = t;
  const days = [...Array(7)].map((_, i) => addDays(wkStart, i));
  const a = new Date(days[0] + "T12:00"), z = new Date(days[6] + "T12:00");
  const label = a.getMonth() === z.getMonth() ? `${a.getDate()}–${z.getDate()} ${MESI[a.getMonth()]}` : `${a.getDate()} ${MESI[a.getMonth()].slice(0, 3)} – ${z.getDate()} ${MESI[z.getMonth()].slice(0, 3)}`;
  // titolo lungo per Mac: "da Domenica 1 a Sabato 7 - Novembre" (se la settimana cambia mese: "da Giovedì 29 - Ottobre a Mercoledì 4 - Novembre")
  const longLabel = `da ${cap(GIORNI[a.getDay()])} ${a.getDate()}${a.getMonth() === z.getMonth() ? "" : " - " + cap(MESI[a.getMonth()])} a ${cap(GIORNI[z.getDay()])} ${z.getDate()} - ${cap(MESI[z.getMonth()])}`;
  const inWeek = dated.filter(x => x.due_date >= days[0] && x.due_date <= days[6]);
  const [s0, e0] = hourRange(inWeek);
  const parts = days.map((d, i) => dayParts(d, dated, s0, e0, i));
  const desk = h("div", { class: "wk-desk" },
    h("span"), parts.map(p => p.head), h("span", { class: "wk-axl" }), parts.map(p => p.allday), axis(s0, e0), parts.map(p => p.col));
  // iPhone: week strip with counts + the selected day with its hours
  const dayList = dated.filter(x => x.due_date === selDay);
  const timed = dayList.filter(x => x.due_time).map(x => +x.due_time.slice(0, 2));
  const nowH = selDay === t ? new Date().getHours() : null;
  if (nowH !== null && timed.length) timed.push(nowH);
  const ms = timed.length ? Math.max(0, Math.min(...timed) - 1) : 8;
  const me = timed.length ? Math.min(24, Math.max(Math.max(...timed) + 2, ms + 5)) : 9;
  const sp = dayParts(selDay, dated, ms, me, 0);
  const strip = h("div", { class: "wk-strip" }, days.map((d, i) => {
    const { count, total } = parts[i], doneN = total - count;
    return h("button", { class: "wk-sd" + (d === selDay ? " sel" : "") + (d === t ? " today" : "") + (total ? "" : " empty") + (total && !count ? " full" : ""), onclick: () => { selDay = d; render(); } },
      h("span", { class: "wk-dow" }, DOW[(new Date(d + "T12:00").getDay() + 6) % 7]), h("span", { class: "wk-num" }, String(+d.slice(8))),
      h("span", { class: "wk-bar" }, h("i", { style: { width: (total ? Math.round(doneN / total * 100) : 0) + "%" } })));
  }));
  const mob = h("div", { class: "wk-mob" }, strip, h("div", { class: "wk-mday" }, sp.allday, timed.length ? h("div", { class: "tl-wrap" }, axis(ms, me), sp.col) : null));
  return h("div", { class: "wk", style: { "--row": ROW + "px" } },
    h("div", { class: "wk-head" }, h("div", { class: "wk-title" }, h("span", { class: "t-long" }, longLabel), h("span", { class: "t-short" }, label)),
      h("div", { class: "wk-nav" },
        (wkStart !== t || selDay !== t) ? h("button", { class: "wk-today", onclick: () => { selDay = t; wkStart = t; render(); } }, "Oggi") : null,
        h("button", { class: "icon-btn", title: "Settimana prima", onclick: () => { wkStart = addDays(wkStart, -7); selDay = wkStart; render(); } }, icon("back")),
        h("button", { class: "icon-btn", title: "Settimana dopo", onclick: () => { wkStart = addDays(wkStart, 7); selDay = wkStart; render(); } }, icon("chev")))),
    desk, mob);
}
function renderToday(inner) {
  const t = today(), d = new Date(); if (!selDay) selDay = t;
  const dated = Object.values(items).filter(x => x.parent && x.due_date);
  const late = dated.filter(x => x.due_date < t && !x.done && visible(x)).sort(byDue);
  const { open: todayOpen, done: todayDone } = dayStats();
  inner.append(h("div", { class: "hero" },
    h("div", { class: "date" }, GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()]),
    h("div", { class: "big-title" }, greeting()),
    h("div", { class: "pills" },
      h("span", { class: "pill" + (todayOpen ? "" : " zero") }, h("b", null, todayOpen), "oggi"),
      h("span", { class: "pill green" + (todayDone ? "" : " zero") }, h("b", null, todayDone), todayDone === 1 ? "fatta" : "fatte"),
      h("span", { class: "pill red" + (late.length ? "" : " zero") }, h("b", null, late.length), late.length === 1 ? "scaduta" : "scadute"))));
  const addNode = addRow("today", "Nuovo promemoria", () => ({ parent: ensureInbox(), extra: { due_date: selDay, remind: "morning" } }));
  if (!isMobile()) inner.append(h("ul", { class: "add-top" }, addNode));   // Mac: in alto, sopra la settimana
  inner.append(weekBoard(dated));
  if (late.length) { inner.append(h("div", { class: "group-h late" }, "Scaduti")); inner.append(panel(itemList(late, { flat: true, path: true }))); }
  const dayList = dated.filter(x => x.due_date === selDay && visible(x)).sort(byDue);
  inner.append(h("div", { class: "group-h" }, selDay === t ? "Oggi" : cap(dayLabel(selDay, true))));
  const l = itemList(dayList, { flat: true, path: true });
  if (isMobile()) l.append(addNode);   // iPhone: resta sotto la lista del giorno
  inner.append(panel(l));
  if (cats().length) {
    inner.append(h("div", { class: "group-h" }, "Categorie"));
    inner.append(h("div", { class: "cat-cards" }, cats().map(cat => {
      const all = desc(cat.id), doneN = all.filter(k => items[k].done).length, openN = all.length - doneN;
      return h("button", { class: "cat-card", style: { "--c": cat.color || COLORS[5] }, onclick: () => go("c-" + cat.id) },
        h("span", { class: "ico" }, cat.icon || "•"), h("span", { class: "nm" }, cat.text),
        h("span", { class: "ct" }, openN ? openN + " da fare" : "Tutto fatto"),
        h("span", { class: "bar" }, h("i", { style: { width: (all.length ? Math.round(doneN / all.length * 100) : 0) + "%" } })));
    })));
  }
}
function renderScheduled(inner) {
  inner.append(h("div", { class: "big-title" }, "Programmati"), h("p", { class: "page-sub" }, "Tutto quello che ha una scadenza, giorno per giorno"));
  const all = Object.values(items).filter(x => x.parent && x.due_date && visible(x)).sort(byDue);
  const t = today(); const byDay = new Map();
  for (const it of all) { const k = it.due_date < t && !it.done ? "late" : it.due_date; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(it); }
  if (byDay.has("late")) { inner.append(h("div", { class: "group-h late" }, "Scaduti")); inner.append(panel(itemList(byDay.get("late"), { flat: true, path: true }))); byDay.delete("late"); }
  for (const [d, list] of byDay) {
    const lab = dayLabel(d, true);
    inner.append(h("div", { class: "group-h" }, lab.charAt(0).toUpperCase() + lab.slice(1)));
    inner.append(panel(itemList(list, { flat: true, path: true })));
  }
  if (!all.length) inner.append(h("div", { class: "empty" }, "Nessuna scadenza programmata.", h("br"), "Tocca ", h("b", null, "ⓘ"), " su una voce per darle una data."));
}
function renderAll(inner) {
  inner.append(h("div", { class: "big-title" }, "Tutti"), h("p", { class: "page-sub" }, "Tutti i promemoria, per categoria"));
  for (const cat of cats()) {
    inner.append(h("button", { class: "group-h", onclick: () => go("c-" + cat.id) }, (cat.icon || "") + " " + cat.text, " ", h("small", null, openCount(cat.id) || "")));
    const l = itemList(kids(cat.id), {}); l.append(addRow(cat.id, "Nuovo promemoria"));
    inner.append(panel(l, cat.color || COLORS[5]));
  }
  if (!cats().length) inner.append(h("div", { class: "empty" }, "Crea la tua prima categoria con ", h("b", null, "+ Nuova categoria"), "."));
}
function renderDoneView(inner) {
  inner.append(h("div", { class: "big-title" }, "Completati"));
  const list = Object.values(items).filter(x => x.parent && x.done);
  if (!list.length) { inner.append(h("div", { class: "empty" }, "Ancora niente di completato.")); return; }
  inner.append(h("button", { class: "subtle-btn", onclick: () => confirmSheet("Eliminare tutti i " + list.length + " completati?", "Elimina", () => { list.forEach(x => items[x.id] && removeItem(x.id)); commit(); }) }, "Elimina tutti i completati"));
  const ul = h("ul", { class: "items" }); list.forEach(it => ul.append(itemNode(it, { flat: true, path: true }))); inner.append(panel(ul));
}
function renderSearch(inner) {
  const q = searchQ.toLowerCase();
  inner.append(h("div", { class: "big-title" }, "Risultati"));
  const list = Object.values(items).filter(x => x.parent && ((x.text || "").toLowerCase().includes(q) || (x.notes || "").toLowerCase().includes(q)));
  if (!list.length) inner.append(h("div", { class: "empty" }, "Nessun risultato per “" + searchQ + "”"));
  const ul = h("ul", { class: "items" }); list.forEach(it => ul.append(itemNode(it, { flat: true, path: true }))); if (list.length) inner.append(panel(ul));
}

// ================= sheets =================
const wrap = $("#sheetWrap"), sheet = $("#sheet");
let onSheetClose = null;
wrap.addEventListener("click", e => { if (e.target === wrap) closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !wrap.hidden) closeSheet(); });
function openSheet(...children) { sheet.replaceChildren(...children); wrap.hidden = false; sheet.scrollTop = 0; }
function closeSheet() { wrap.hidden = true; sheet.replaceChildren(); const f = onSheetClose; onSheetClose = null; if (f) f(); }
const head = (title, left, right) => h("div", { class: "sheet-head" }, left || h("span", { style: { minWidth: "70px" } }), h("h2", null, title), right || h("span", { style: { minWidth: "70px" } }));
const btn = (label, fn, cls) => h("button", { class: cls || "", onclick: fn }, label);
const field = (...c) => h("div", { class: "field" }, ...c);
const fi = (ic, bg) => h("span", { class: "fi", style: { background: bg } }, icon(ic));
const sw = (checked, onchange) => { const i = h("input", { type: "checkbox" }); i.checked = checked; i.onchange = () => onchange(i.checked); return h("label", { class: "switch" }, i, h("span")); };
const select = (opts, val, onchange) => { const s = h("select", { onchange: () => onchange(s.value) }, Object.entries(opts).map(([k, v]) => h("option", { value: k }, v))); s.value = val; return s; };

function openItem(id, opts = {}) {
  const fresh = !!opts.draft;
  const it = opts.draft || items[id]; if (!it) return;
  const d = { ...it };
  const body = h("div");
  const draw = () => {
    body.replaceChildren(
      h("div", { class: "form-group" },
        field(h("input", { type: "text", value: d.text, placeholder: "Titolo", oninput: e => d.text = e.target.value })),
        field(h("textarea", { placeholder: "Note", oninput: e => d.notes = e.target.value }, d.notes || ""))),
      h("div", { class: "form-group" },
        field(fi("list", "#8e8e93"), h("span", { class: "lab" }, "Categoria"), select(Object.fromEntries(cats().map(c => [c.id, (c.icon ? c.icon + " " : "") + c.text])), fresh ? it.parent : (catOf(id) || {}).id, v => { const cur = fresh ? it.parent : (catOf(id) || {}).id; if (v === cur) { d.parent = it.parent; d.ord = it.ord; } else { d.parent = v; d.ord = nextOrd(v); } }))),
      h("div", { class: "form-group" },
        field(fi("cal", "var(--red)"), h("span", { class: "lab" }, "Data", d.due_date ? h("div", { style: { fontSize: "14px", color: "var(--blue)" } }, dayLabel(d.due_date, true)) : null),
          sw(!!d.due_date, v => { d.due_date = v ? (d.due_date || today()) : null; if (v && !d.remind) d.remind = d.due_time ? "15m" : "morning"; if (!v) { d.due_time = null; } draw(); })),
        d.due_date ? field(h("span", { class: "lab" }), h("input", { type: "date", value: d.due_date, onchange: e => { if (e.target.value) { d.due_date = e.target.value; draw(); } } })) : null,
        d.due_date ? h("div", { class: "chips" }, [["Oggi", 0], ["Domani", 1], ["Tra 1 settimana", 7]].map(([l, n]) => h("button", { class: "chip", onclick: () => { d.due_date = addDays(today(), n); draw(); } }, l))) : null,
        d.due_date ? field(fi("clock", "var(--blue)"), h("span", { class: "lab" }, "Ora"), sw(!!d.due_time, v => { d.due_time = v ? (d.due_time || "09:00") : null; if (v && d.remind === "morning") d.remind = "15m"; if (!v && (d.remind === "15m" || d.remind === "1h" || d.remind === "at")) d.remind = "morning"; draw(); })) : null,
        d.due_date && d.due_time ? field(h("span", { class: "lab" }), h("input", { type: "time", value: d.due_time, onchange: e => { if (e.target.value) d.due_time = e.target.value; } })) : null),
      h("div", { class: "form-group" },
        field(fi("flag", "#e5484d"), h("span", { class: "lab" }, "Priorità"), h("div", { class: "seg" }, [["Nessuna", 0], ["Bassa", 1], ["Media", 2], ["Alta", 3]].map(([l, v]) => h("button", { class: (d.priority || 0) === v ? "on" : "", onclick: () => { d.priority = v; draw(); } }, l))))),
      d.due_date ? h("div", { class: "form-group" },
        field(fi("bell", "var(--orange)"), h("span", { class: "lab" }, "Avviso"), select(REMIND, d.remind || "none", v => d.remind = v)),
        field(fi("repeat", "#8e8e93"), h("span", { class: "lab" }, "Ripeti"), select(REPEAT, d.repeat || "", v => d.repeat = v || null))) : null,
      d.due_date ? h("div", { class: "form-note" }, "L'avviso arriva sui dispositivi dove hai attivato le notifiche (Impostazioni ⚙︎).") : null,
      fresh ? null : h("div", { class: "form-group" },
        h("button", { class: "field btn", onclick: () => { save(); pickParent(id); } }, h("span", { class: "lab" }, "Sposta in…"), h("span", { style: { color: "var(--label2)", fontSize: "15px" } }, pathOf(id))),
        h("button", { class: "field btn", onclick: () => { save(); closeSheet(); duplicate(id); } }, "Duplica"),
        h("button", { class: "field btn", onclick: () => { save(); closeSheet(); addingUnder = id; it.collapsed = false; if (route.v !== "cat" || catOf(id).id !== route.id) go("c-" + catOf(id).id); focusReq = { id, sel: "add" }; render(); } }, "Aggiungi sotto-voce")),
    );
  };
  const save = () => { if (fresh) { if (!(d.text || "").trim()) { toast("Scrivi un titolo"); return false; } items[it.id] = it; } Object.assign(it, d, { text: (d.text || "").trim() || it.text, notes: (d.notes || "").trim() || null }); if (!it.due_date) { it.due_time = null; it.remind = null; it.repeat = null; } commit(); };
  draw();
  const del = () => { if (fresh) { closeSheet(); return; } const n = desc(id).length; confirmSheet(n ? `Eliminare “${it.text}” e ${n} sotto-voci?` : `Eliminare “${it.text}”?`, "Elimina", () => { removeItem(id); commit(); }); };
  const actions = h("div", { class: "sheet-actions" },
    h("button", { class: "act red", onclick: del }, "Elimina"),
    h("button", { class: "act sky", onclick: closeSheet }, "Annulla"),
    h("button", { class: "act green", onclick: () => { if (save() !== false) closeSheet(); } }, "Conferma"));
  openSheet(head("Dettagli"), body, actions);
  if (fresh) setTimeout(() => { const t = body.querySelector('input[type=text]'); if (t) t.focus(); }, 60);
}
function duplicate(id) {
  const src = items[id]; const sib = kids(src.parent); const i = sib.findIndex(x => x.id === id);
  const ord = i < sib.length - 1 ? (src.ord + sib[i + 1].ord) / 2 : src.ord + 1;
  const cp = (sid, parent, top) => { const s = items[sid]; const n = { ...s, id: uid(), parent, done: false }; if (top) { n.ord = ord; n.text = s.text + " (copia)"; } items[n.id] = n; kids(sid).forEach(k => cp(k.id, n.id)); return n; };
  const n = cp(id, src.parent, true); commit(); toast("Duplicato"); return n;
}
function pickParent(id) {
  const it = items[id]; const banned = new Set(desc(id).concat(id));
  const box = h("div", { class: "form-group tree-pick" });
  const walk = (p, depth) => kids(p).forEach(k => {
    if (banned.has(k.id)) return;
    box.append(h("button", { class: "field btn", style: { "--d": depth, color: it.parent === k.id ? "var(--label2)" : "" }, disabled: it.parent === k.id, onclick: () => { it.parent = k.id; it.ord = nextOrd(k.id); k.collapsed = false; commit(); closeSheet(); toast("Spostato in " + k.text); } },
      depth === 0 ? h("span", { class: "fi", style: { background: k.color || COLORS[5], borderRadius: "50%", fontSize: "15px" } }, k.icon || "") : null, h("span", { class: "lab", style: { fontWeight: depth === 0 ? 600 : 400 } }, k.text)));
    walk(k.id, depth + 1);
  });
  walk("", 0);
  openSheet(head("Sposta in", btn("Annulla", closeSheet)), h("div", { class: "form-note", style: { margin: "0 0 10px" } }, "Scegli la categoria o la voce sotto cui mettere “" + it.text + "”."), box);
}
function openCategory(id) {
  const cat = id ? items[id] : null;
  const d = cat ? { text: cat.text, color: cat.color || COLORS[5], icon: cat.icon || "" } : { text: "", color: COLORS[5], icon: "📋" };
  const prev = h("span", { class: "big" }); const nameI = h("input", { type: "text", value: d.text, placeholder: "Nome categoria", oninput: e => d.text = e.target.value });
  const colors = h("div", { class: "colors" }), emojis = h("div", { class: "emojis" });
  const draw = () => {
    prev.style.background = d.color; prev.textContent = d.icon || "•"; nameI.style.color = d.color;
    colors.replaceChildren(...COLORS.map(c => h("button", { class: c === d.color ? "on" : "", style: { background: c }, "aria-label": c, onclick: () => { d.color = c; draw(); } })));
    emojis.replaceChildren(...EMOJIS.map(e => h("button", { class: e === d.icon ? "on" : "", onclick: () => { d.icon = e; draw(); } }, e)));
  };
  draw();
  const done = () => {
    const name = d.text.trim(); if (!name) { nameI.focus(); return; }
    if (cat) Object.assign(cat, { text: name, color: d.color, icon: d.icon }); else { const c = mkItem("", name, { color: d.color, icon: d.icon }); closeSheet(); commit(false); go("c-" + c.id); focusReq = { id: c.id, sel: "add" }; render(); return; }
    closeSheet(); commit();
  };
  nameI.addEventListener("keydown", e => { if (e.key === "Enter") done(); });
  openSheet(head(cat ? "Modifica categoria" : "Nuova categoria", btn("Annulla", closeSheet), btn("Fine", done, "r")),
    h("div", { class: "form-group" }, h("div", { class: "cat-preview" }, prev, nameI)),
    h("div", { class: "form-group" }, colors), h("div", { class: "form-group" }, emojis));
  if (!cat) setTimeout(() => nameI.focus(), 50);
}
function catMenu(id) {
  const cat = items[id];
  openSheet(head(cat.text, null, btn("Fine", closeSheet, "r")),
    h("div", { class: "form-group" },
      h("button", { class: "field btn", onclick: () => openCategory(id) }, "Modifica nome, colore e icona"),
      h("button", { class: "field btn", onclick: () => { showDone = !showDone; lsSet("showDone", showDone); closeSheet(); render(); } }, showDone ? "Nascondi completati" : "Mostra completati")),
    h("div", { class: "form-group" },
      h("button", { class: "field btn danger", onclick: () => confirmSheet(`Eliminare la categoria “${cat.text}” e tutto quello che contiene (${desc(id).length} voci)?`, "Elimina categoria", () => { removeItem(id); commit(false); go(isMobile() ? "home" : "today"); }) }, "Elimina categoria")));
}
function confirmSheet(msg, label, fn) {
  openSheet(head("Conferma", btn("Annulla", closeSheet)), h("div", { class: "form-note", style: { margin: "0 0 14px", fontSize: "15px" } }, msg),
    h("div", { class: "form-group" }, h("button", { class: "field btn danger", onclick: () => { closeSheet(); fn(); } }, label)));
}

// ---------- settings ----------
async function openSettings() {
  const body = h("div", null, h("div", { class: "form-note", style: { margin: "0" } }, "Caricamento…"));
  openSheet(head("Impostazioni", null, btn("Fine", closeSheet, "r")), body);
  let s; try { s = await api("/api/settings"); } catch (_) { body.replaceChildren(h("div", { class: "form-note" }, "Impossibile caricare. Sei online?")); return; }
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const perm = pushOk ? Notification.permission : "unsupported";
  let subscribed = false;
  if (pushOk) { try { const reg = await navigator.serviceWorker.ready; subscribed = !!(await reg.pushManager.getSubscription()); } catch (_) {} }
  const status = h("div", { class: "form-note" });
  const pushGroup = h("div", { class: "form-group" });
  if (!pushOk && iOS && !standalone) {
    pushGroup.append(field(fi("bell", "var(--red)"), h("span", { class: "lab" }, "Avvisi")));
    status.textContent = "Su iPhone gli avvisi funzionano solo dall'app sulla schermata Home: in Safari tocca Condividi › Aggiungi alla schermata Home, poi apri Organize da lì e torna qui.";
  } else if (!pushOk) {
    pushGroup.append(field(fi("bell", "var(--red)"), h("span", { class: "lab" }, "Avvisi non supportati da questo browser")));
  } else {
    pushGroup.append(
      h("button", { class: "field btn", onclick: async () => {
        status.textContent = "Attivo…";
        try { await enablePush(s.vapidKey); status.textContent = "Avvisi attivi su questo dispositivo ✓"; openSettings(); }
        catch (e) { status.textContent = e.message; }
      } }, fi("bell", "var(--red)"), h("span", { class: "lab" }, subscribed ? "Avvisi attivi su questo dispositivo ✓" : "Attiva avvisi su questo dispositivo")),
      h("button", { class: "field btn", onclick: async () => { status.textContent = "Invio…"; try { const r = await api("/api/push/test", {}); status.textContent = r.sent ? `Inviato a ${r.sent} dispositivo/i. Dovrebbe arrivare tra pochi secondi.` : "Nessun dispositivo con avvisi attivi."; } catch (e) { status.textContent = e.message; } } }, fi("bell", "var(--orange)"), h("span", { class: "lab" }, "Invia un avviso di prova")));
    status.textContent = perm === "denied" ? "Le notifiche sono bloccate per questo sito: riattivale dalle impostazioni del sistema." : `Dispositivi con avvisi attivi: ${s.devices}.`;
  }
  const calCode = h("code", null, s.calendarUrl);
  body.replaceChildren(
    h("div", { class: "form-group-title" }, "Aspetto"),
    h("div", { class: "form-group" }, field(h("span", { class: "lab" }, "Tema"), h("div", { class: "seg" }, [["Auto", "auto"], ["Chiaro", "light"], ["Scuro", "dark"]].map(([l, v]) => h("button", { class: lsGet("theme", "auto") === v ? "on" : "", onclick: e => { lsSet("theme", v); applyTheme(); e.target.parentNode.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === e.target)); } }, l))))),
    h("div", { class: "form-group-title" }, "Avvisi"), pushGroup, status,
    h("div", { class: "form-group-title" }, "App su Mac"),
    h("div", { class: "form-note", style: { margin: "0 0 20px" } }, "Per averla come un'app a sé, a schermo intero e con la sua icona: in Safari scegli ", h("b", null, "File › Aggiungi al Dock"), ". Nel menu di Chrome: ", h("b", null, "Salva e condividi › Installa Organize"), "."),
    h("div", { class: "form-group-title" }, "Calendario iCloud (Mac e iPhone)"), ...caldavBlock(s.caldav),
    h("div", { class: "form-group-title" }, "Google Calendar (alternativa)"), ...googleBlock(s.google),
    h("div", { class: "form-group-title" }, "Calendario Apple / altri"),
    h("div", { class: "form-group" },
      h("a", { class: "field btn", href: s.calendarUrl.replace(/^https?:/, "webcal:"), style: { textDecoration: "none" } }, h("span", { class: "lab" }, "Aggiungi al Calendario Apple")),
      h("div", { class: "copy-box" }, calCode, h("button", { class: "btn-fill", onclick: async e => { try { await navigator.clipboard.writeText(s.calendarUrl); e.target.textContent = "Copiato"; } catch (_) { const r = document.createRange(); r.selectNodeContents(calCode); getSelection().removeAllRanges(); getSelection().addRange(r); } } }, "Copia"))),
    h("div", { class: "form-note" }, "Premi il pulsante da Safari e conferma ", h("i", null, "Iscriviti"), ": le voci con data compaiono nel Calendario Apple, con gli avvisi scelti. ", h("b", null, "Se hai collegato iCloud o Google qui sopra non serve"), ": vedresti ogni voce due volte (se hai già aggiunto questo indirizzo a Google Calendar, toglilo)."),
    h("div", { class: "form-group-title" }, "Account"),
    h("div", { class: "form-group" },
      h("button", { class: "field btn", onclick: changePassword }, "Cambia password"),
      h("button", { class: "field btn danger", onclick: async () => { await api("/api/logout", {}).catch(() => {}); localStorage.clear(); location.reload(); } }, "Esci")));
}
function caldavBlock(c) {
  const note = h("div", { class: "form-note" });
  const link = (href, t) => h("a", { href, target: "_blank", rel: "noopener" }, t);
  if (c.connected) {
    const when = c.lastSync ? new Date(c.lastSync).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";
    note.textContent = c.error ? "⚠️ " + c.error : "Le voci con data finiscono nel calendario «Organize», gli eventi dei tuoi calendari arrivano qui nella categoria «Calendario». Si aggiorna da solo" + (when ? " (ultimo controllo alle " + when + ")." : ".");
    return [h("div", { class: "form-group" },
      field(fi("cal", "var(--green)"), h("span", { class: "lab" }, "Collegato ✓ " + c.user)),
      h("button", { class: "field btn", onclick: async () => { note.textContent = "Sincronizzo…"; try { const r = await api("/api/caldav/sync", {}); note.textContent = r.ok ? "Fatto ✓" : "⚠️ " + (r.error || "Errore"); pull().catch(() => {}); } catch (e) { note.textContent = e.message; } } }, h("span", { class: "lab" }, "Sincronizza adesso")),
      h("button", { class: "field btn danger", onclick: () => confirmSheet("Le voci già sincronizzate restano sia qui sia nel Calendario; smettono solo di seguirsi.", "Scollega iCloud", async () => { await api("/api/caldav/disconnect", {}); openSettings(); }) }, h("span", { class: "lab" }, "Scollega iCloud"))), note];
  }
  const idI = h("input", { type: "text", placeholder: "ID Apple (la tua email)", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
  const pwI = h("input", { type: "password", placeholder: "Password per app (xxxx-xxxx-xxxx-xxxx)", autocomplete: "off" });
  const go = async () => { note.textContent = "Collego…"; try { await api("/api/caldav/connect", { appleId: idI.value, password: pwI.value }); toast("iCloud collegato ✓"); openSettings(); } catch (e) { note.textContent = "⚠️ " + e.message; } };
  const steps = h("ol", { class: "g-steps" },
    h("li", null, "Apri ", link("https://account.apple.com", "account.apple.com"), " e accedi › ", h("b", null, "Accesso e sicurezza"), " › ", h("b", null, "Password per app"), " › ", h("b", null, "+"), ". Chiamala ", h("i", null, "Organize"), " e copia la password che ti dà."),
    h("li", null, "Nel Calendario del Mac: ", h("b", null, "File › Nuovo calendario › iCloud"), " e chiamalo ", h("b", null, "Organize"), ". Qui finiranno le tue voci."),
    h("li", null, "Scrivi qui sotto il tuo ID Apple, incolla la password e premi ", h("b", null, "Collega iCloud"), "."));
  return [h("details", { class: "g-guide", open: "" }, h("summary", null, "Come si prepara (3 minuti, una volta sola)"), steps),
    h("div", { class: "form-group" }, field(idI), field(pwI), h("button", { class: "field btn", onclick: go }, fi("cal", "var(--blue)"), h("span", { class: "lab" }, "Collega iCloud"))), note];
}
function googleBlock(g) {
  const note = h("div", { class: "form-note" });
  const link = (href, t) => h("a", { href, target: "_blank", rel: "noopener" }, t);
  const copyBox = txt => { const c = h("code", null, txt); return h("div", { class: "copy-box", style: { padding: "6px 0 0" } }, c, h("button", { class: "btn-fill", onclick: async e => { try { await navigator.clipboard.writeText(txt); e.target.textContent = "Copiato"; } catch (_) { const r = document.createRange(); r.selectNodeContents(c); getSelection().removeAllRanges(); getSelection().addRange(r); } } }, "Copia")); };
  if (g.connected) {
    const when = g.lastSync ? new Date(g.lastSync).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";
    note.textContent = g.error ? "⚠️ " + g.error : "Le voci con data finiscono su Google, gli eventi di Google arrivano qui nella categoria «Google Calendar». Si aggiorna da solo" + (when ? " (ultimo controllo alle " + when + ")." : ".");
    return [h("div", { class: "form-group" },
      field(fi("cal", "var(--green)"), h("span", { class: "lab" }, "Collegato ✓ " + (g.email || ""))),
      h("button", { class: "field btn", onclick: async () => { note.textContent = "Sincronizzo…"; try { const r = await api("/api/google/sync", {}); note.textContent = r.ok ? "Fatto ✓" : "⚠️ " + (r.error || "Errore"); pull().catch(() => {}); } catch (e) { note.textContent = e.message; } } }, h("span", { class: "lab" }, "Sincronizza adesso")),
      h("button", { class: "field btn danger", onclick: () => confirmSheet("Le voci già sincronizzate restano sia qui sia su Google; smettono solo di seguirsi.", "Scollega Google", async () => { await api("/api/google/disconnect", {}); openSettings(); }) }, h("span", { class: "lab" }, "Scollega Google"))), note];
  }
  const idI = h("input", { type: "text", placeholder: "ID client (finisce con .apps.googleusercontent.com)", value: g.clientId || "", autocomplete: "off", autocapitalize: "off", spellcheck: "false" });
  const secI = h("input", { type: "password", placeholder: "Segreto client", autocomplete: "off" });
  const go = async () => { note.textContent = "Salvo…"; try { if (idI.value || secI.value || !g.configured) await api("/api/google/config", { clientId: idI.value, clientSecret: secI.value }); location.href = "/api/google/start"; } catch (e) { note.textContent = "⚠️ " + e.message; } };
  const steps = h("ol", { class: "g-steps" },
    h("li", null, "Apri ", link("https://console.cloud.google.com/projectcreate", "Google Cloud"), ", accedi con il tuo Google e crea un progetto chiamato ", h("b", null, "Organize"), "."),
    h("li", null, "Apri ", link("https://console.cloud.google.com/apis/library/calendar-json.googleapis.com", "Google Calendar API"), " e premi ", h("b", null, "Abilita"), "."),
    h("li", null, "Apri ", link("https://console.cloud.google.com/auth/overview", "Google Auth Platform"), " › ", h("b", null, "Inizia"), ": nome app Organize, la tua email, pubblico ", h("b", null, "Esterno"), ", poi Crea."),
    h("li", null, "Nella voce ", h("b", null, "Pubblico"), " premi ", h("b", null, "Pubblica app"), " e conferma (così il collegamento non scade dopo 7 giorni)."),
    h("li", null, "Nella voce ", link("https://console.cloud.google.com/auth/clients", "Client"), " premi ", h("b", null, "Crea client"), " › tipo ", h("b", null, "Applicazione web"), ". In ", h("i", null, "URI di reindirizzamento autorizzati"), " incolla questo indirizzo, poi Crea:", copyBox(g.redirectUri)),
    h("li", null, "Copia ", h("b", null, "ID client"), " e ", h("b", null, "Segreto client"), " e incollali qui sotto."),
    h("li", null, "Premi ", h("b", null, "Salva e collega Google"), ". Se Google avvisa «app non verificata»: ", h("b", null, "Avanzate › Vai a Organize"), " e consenti il Calendario."));
  return [
    h("details", { class: "g-guide", open: !g.configured ? "" : null }, h("summary", null, g.configured ? "Rifai la preparazione / cambia le chiavi" : "Come si prepara (10 minuti, una volta sola)"), steps),
    h("div", { class: "form-group" }, field(idI), field(secI),
      h("button", { class: "field btn", onclick: go }, fi("cal", "var(--blue)"), h("span", { class: "lab" }, g.configured ? "Collega Google" : "Salva e collega Google"))), note];
}
function changePassword() {
  const i = h("input", { type: "password", placeholder: "Nuova password (min. 6)", autocomplete: "new-password" });
  const note = h("div", { class: "form-note" });
  const ok = async () => { try { await api("/api/password", { password: i.value }); closeSheet(); toast("Password cambiata"); } catch (e) { note.textContent = e.message; } };
  openSheet(head("Cambia password", btn("Annulla", closeSheet), btn("Salva", ok, "r")), h("div", { class: "form-group" }, field(i)), note);
  setTimeout(() => i.focus(), 50);
}
async function enablePush(vapidKey) {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permesso negato. Puoi riattivarlo dalle impostazioni del sistema.");
  const key = (b => { b = b.replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "="; return Uint8Array.from(atob(b), c => c.charCodeAt(0)); })(vapidKey);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  const ua = navigator.userAgent; const label = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Mac/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : "Browser";
  await api("/api/push/subscribe", { subscription: sub.toJSON(), label });
}

let toastT = null;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

// ================= auth =================
function showAuth(setup) {
  const pw = h("input", { type: "password", placeholder: setup ? "Scegli una password" : "Password", autocomplete: setup ? "new-password" : "current-password" });
  const err = h("div", { class: "err" });
  const submit = async e => {
    e.preventDefault(); err.textContent = "";
    try {
      await api(setup ? "/api/setup" : "/api/login", { password: pw.value, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
      start();
    } catch (x) { err.textContent = x.message; }
  };
  $("#app").replaceChildren(h("div", { class: "auth" }, h("form", { class: "auth-card", onsubmit: submit },
    h("img", { class: "auth-tile", src: "/logo-tile.png", alt: "" }),
    h("img", { class: "auth-word", src: "/logo-wordmark.png", alt: "Organize" }),
    h("p", null, setup ? "Benvenuto! Scegli la password per entrare. Ti servirà su ogni dispositivo." : "Inserisci la password per continuare."),
    pw, h("button", { type: "submit" }, setup ? "Inizia" : "Entra"), err)));
  setTimeout(() => pw.focus(), 50);
}

// ================= boot =================
async function start() {
  items = lsGet("items", {}); synced = lsGet("synced", {}); showDone = lsGet("showDone", false);
  route = parseHash(); render();
  try { await pull(); route = parseHash(); render(); } catch (_) { setSync("err"); }
  const gq = new URLSearchParams(location.search).get("google");
  if (gq) {
    history.replaceState(null, "", location.pathname + location.hash);
    toast(gq === "ok" ? "Google Calendar collegato ✓" : "Collegamento non riuscito: controlla ID e segreto");
    openSettings();
  }
}
// ogni minuto ricarico le voci (cambiamenti arrivati da Google), ma mai mentre scrivi o hai una scheda aperta
setInterval(() => {
  if (document.visibilityState !== "visible" || !$("#sheetWrap").hidden) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
  pull().catch(() => {});
}, 60000);
window.addEventListener("hashchange", () => { if (route.v === "cat") lsSet("lastCat", route.id); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && items && Object.keys(synced).length + Object.keys(items).length >= 0) pull().catch(() => {}); });
window.addEventListener("online", () => scheduleSync(100));
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.open) location.href = e.data.open; });
}
let lastMobile = isMobile();
window.addEventListener("resize", () => { const m = isMobile(); if (m !== lastMobile) { lastMobile = m; route = parseHash(); render(); } });

applyTheme();
(async () => {
  try {
    const st = await api("/api/status");
    if (st.setup) showAuth(true); else if (!st.authed) showAuth(false); else start();
  } catch (_) {
    if (Object.keys(lsGet("items", {})).length) start(); else $("#app").replaceChildren(h("div", { class: "auth" }, h("div", { class: "auth-card" }, h("h1", null, "Organize"), h("p", null, "Sei offline. Riprova quando hai connessione."))));
  }
})();
})();
