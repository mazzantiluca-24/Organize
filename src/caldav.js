// Sincronizzazione a due vie con il Calendario iCloud (CalDAV): quello che Mac e iPhone già sincronizzano.
//  - Organize → iCloud: le voci con data diventano eventi nel calendario "Organize" (creato da solo).
//  - iCloud → Organize: gli eventi di tutti i tuoi calendari (da una settimana fa a due mesi avanti) arrivano nella categoria "Google Calendar"... che qui si chiama "Calendario".
// Accesso con ID Apple + "password per app" (si crea su account.apple.com), nessuna pagina da configurare.
import { getSetting, setSetting, nowIso, rand, localToUtc, localParts, computeRemindAt, spanMins } from "./util.js";
import { applyEvent, removeLocal, lock, CAT_ID } from "./gcal.js";

const base = env => env.CALDAV_BASE || "https://caldav.icloud.com";
const BACK_DAYS = 7, FWD_DAYS = 60, BATCH = 15;
const NS = 'xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/"';

// ---------- piccole utilità XML / iCal ----------
const tagAll = (xml, name) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "gi"))].map(m => m[1]);
const tag1 = (xml, name) => { const a = tagAll(xml, name); return a.length ? a[0] : null; };
const xmlText = s => (s || "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#13;/g, "\r").replace(/&#10;/g, "\n").replace(/&amp;/g, "&");
const unfold = t => t.replace(/\r?\n[ \t]/g, "");
const icsUnesc = s => String(s || "").replace(/\\[nN]/g, "\n").replace(/\\([,;\\])/g, "$1");
const icsEsc = s => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = line => { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); } out.push(line); return out.join("\r\n"); };
const icsUtc = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function parseEvents(ics) {
  const out = [];
  for (const blk of unfold(ics).split("BEGIN:VEVENT").slice(1)) {
    const body = blk.split("END:VEVENT")[0].replace(/BEGIN:VALARM[\s\S]*?END:VALARM/g, "");
    const props = {};
    for (const line of body.split(/\r?\n/)) {
      const i = line.indexOf(":"); if (i < 1) continue;
      const [name, ...params] = line.slice(0, i).split(";");
      const key = name.toUpperCase(); if (props[key]) continue;
      props[key] = { v: line.slice(i + 1), p: Object.fromEntries(params.map(x => { const [k, ...r] = x.split("="); return [k.toUpperCase(), r.join("=").replace(/^"|"$/g, "")]; })) };
    }
    out.push(props);
  }
  return out;
}
function dtParse(pr, tz) {
  if (!pr) return null;
  const m = pr.v.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/); if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (m[4] === undefined) return { allDay: true, date };
  let ms;
  if (m[7]) ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  else { try { ms = localToUtc(pr.p.TZID || tz, date, `${m[4]}:${m[5]}`); } catch (_) { ms = localToUtc(tz, date, `${m[4]}:${m[5]}`); } }
  return { allDay: false, ms };
}
function durMs(v) { const m = String(v || "").match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/); return m ? (((+m[1] || 0) * 7 + (+m[2] || 0)) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60) * 1000 : 0; }
// evento iCal -> data/ora di Organize
function whenOf(tz, pr, now) {
  const s = dtParse(pr.DTSTART, tz); if (!s) return null;
  const e = pr.DTEND ? dtParse(pr.DTEND, tz) : null;
  const ro = pr.RRULE || pr["RECURRENCE-ID"] ? "R" : "";      // ripetizioni: si vedono ma non si modificano da qui
  if (s.allDay) {
    const days = e && e.allDay ? Math.max(1, Math.round((Date.parse(e.date) - Date.parse(s.date)) / 864e5)) : 1;
    const endDate = new Date(Date.parse(s.date + "T12:00:00Z") + days * 864e5).toISOString().slice(0, 10);
    return { date: s.date, time: null, span: ro + "d" + days, ms: Date.parse(s.date + "T12:00:00Z"), past: endDate <= localParts(tz, now).date };
  }
  const em = e && !e.allDay ? e.ms : s.ms + (pr.DURATION ? durMs(pr.DURATION.v) : 30 * 60000);
  const p = localParts(tz, s.ms);
  return { date: p.date, time: p.time, span: ro + "m" + Math.max(5, Math.round((em - s.ms) / 60000)), ms: s.ms, past: em < now };
}

// ---------- rete ----------
const auth = env => getSetting(env, "cd_user").then(async u => "Basic " + btoa(u + ":" + (await getSetting(env, "cd_pass"))));
async function dav(env, method, url, { depth, body, headers } = {}) {
  const r = await fetch(url, { method, headers: { authorization: await auth(env), ...(depth !== undefined ? { depth: String(depth) } : {}), ...(body ? { "content-type": method === "PUT" ? "text/calendar; charset=utf-8" : "application/xml; charset=utf-8" } : {}), ...(headers || {}) }, body });
  return { status: r.status, text: r.status === 204 ? "" : await r.text(), etag: r.headers.get("etag") };
}
const abs = (host, href) => new URL(href, host).href;

async function discover(env) {
  let r = await dav(env, "PROPFIND", base(env) + "/", { depth: 0, body: `<d:propfind ${NS}><d:prop><d:current-user-principal/></d:prop></d:propfind>` });
  if (r.status === 401) throw new Error("ID Apple o password per app non validi");
  if (r.status >= 300) throw new Error("iCloud ha risposto " + r.status);
  const principal = xmlText(tag1(tag1(r.text, "current-user-principal") || "", "href"));
  if (!principal) throw new Error("Non trovo il tuo calendario iCloud");
  r = await dav(env, "PROPFIND", abs(base(env), principal), { depth: 0, body: `<d:propfind ${NS}><d:prop><c:calendar-home-set/></d:prop></d:propfind>` });
  const homeHref = xmlText(tag1(tag1(r.text, "calendar-home-set") || "", "href"));
  if (!homeHref) throw new Error("Non trovo i tuoi calendari iCloud");
  const home = abs(base(env), homeHref);
  await setSetting(env, "cd_home", home);
  return home;
}
async function listCals(env) {
  const home = await getSetting(env, "cd_home");
  const r = await dav(env, "PROPFIND", home, { depth: 1, body: `<d:propfind ${NS}><d:prop><d:resourcetype/><d:displayname/><cs:getctag/><c:supported-calendar-component-set/></d:prop></d:propfind>` });
  if (r.status >= 300) throw new Error("iCloud ha risposto " + r.status);
  return tagAll(r.text, "response").map(x => ({ href: xmlText(tag1(x, "href")), name: xmlText(tag1(x, "displayname") || ""), ctag: xmlText(tag1(x, "getctag") || ""), cal: /<(?:\w+:)?calendar\s*\/>/i.test(tag1(x, "resourcetype") || ""), ev: /name="VEVENT"/i.test(x) }))
    .filter(c => c.cal && c.ev).map(c => ({ ...c, path: new URL(c.href, home).pathname }));
}
async function ensureOwnCalendar(env) {
  const cals = await listCals(env);
  let own = cals.find(c => c.name === "Organize");
  if (!own) {
    const home = await getSetting(env, "cd_home"), url = home.replace(/\/?$/, "/") + rand(9).replace(/[^\w]/g, "x") + "/";
    const NEED = "Crea in Calendario un calendario chiamato Organize (File › Nuovo calendario › iCloud) e riprova.";
    let r; try { r = await dav(env, "MKCALENDAR", url, { body: `<c:mkcalendar ${NS}><d:set><d:prop><d:displayname>Organize</d:displayname><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set></d:prop></d:set></c:mkcalendar>` }); } catch (_) { throw new Error(NEED); }
    if (r.status >= 300) throw new Error(NEED);
    own = { path: new URL(url).pathname };
  }
  await setSetting(env, "cd_cal", own.path);
}

// ---------- collegamento ----------
export async function status(env) {
  const [u, last, err] = await Promise.all(["cd_user", "cd_last_sync", "cd_error"].map(k => getSetting(env, k)));
  return { connected: !!(u && (await getSetting(env, "cd_cal"))), user: u || "", lastSync: last || "", error: err || "" };
}
export async function connect(env, body) {
  const u = String(body.appleId || "").trim(), p = String(body.password || "").replace(/\s/g, "");
  if (!u.includes("@")) throw new Error("Scrivi il tuo ID Apple (l'email)");
  if (p.length < 8) throw new Error("La password per app sembra incompleta");
  await setSetting(env, "cd_user", u); await setSetting(env, "cd_pass", p);
  try { await discover(env); await ensureOwnCalendar(env); }
  catch (e) { await env.DB.prepare("DELETE FROM settings WHERE k IN ('cd_user', 'cd_pass', 'cd_home', 'cd_cal')").run(); throw e; }
  await env.DB.prepare("DELETE FROM settings WHERE k IN ('cd_ctags', 'cd_last_full', 'cd_error')").run();
}
export async function disconnect(env) { await env.DB.prepare("DELETE FROM settings WHERE substr(k, 1, 3) = 'cd_'").run(); }

// ---------- iCloud → Organize ----------
async function pull(env, tz, forceFull) {
  const cals = await listCals(env), now = Date.now();
  const lastFull = Number((await getSetting(env, "cd_last_full")) || 0);
  const full = forceFull || now - lastFull > 6 * 3600e3;
  const ctags = JSON.parse((await getSetting(env, "cd_ctags")) || "{}");
  const home = await getSetting(env, "cd_home");
  const from = new Date(now - BACK_DAYS * 864e5), to = new Date(now + FWD_DAYS * 864e5);
  const winA = from.toISOString().slice(0, 10), winB = to.toISOString().slice(0, 10);
  const byG = Object.fromEntries((await env.DB.prepare("SELECT id, text, done, remind, updated_at, due_date, gcal_id, gcal_updated, gcal_sync_at, gcal_src FROM items WHERE gcal_id IS NOT NULL").all()).results.map(r => [r.gcal_id, r]));
  const tomb = new Set((await env.DB.prepare("SELECT gcal_id FROM gcal_tomb").all()).results.map(r => r.gcal_id));
  const st = { catOk: false };
  for (const cal of cals) {
    if (!full && ctags[cal.path] && ctags[cal.path] === cal.ctag) continue;
    const q = `<c:calendar-query ${NS}><d:prop><d:getetag/><c:calendar-data><c:expand start="${icsUtc(+from)}" end="${icsUtc(+to)}"/></c:calendar-data></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${icsUtc(+from)}" end="${icsUtc(+to)}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;
    const r = await dav(env, "REPORT", abs(home, cal.href), { depth: 1, body: q });
    if (r.status >= 300) throw new Error("iCloud ha risposto " + r.status);
    const seen = new Set();
    for (const resp of tagAll(r.text, "response")) {
      const href = new URL(xmlText(tag1(resp, "href")), home).pathname, etag = xmlText(tag1(resp, "getetag") || ""), data = xmlText(tag1(resp, "calendar-data") || "");
      if (!data) continue;
      for (const pr of parseEvents(data)) {
        const rid = pr["RECURRENCE-ID"] ? "#" + pr["RECURRENCE-ID"].v : "";
        const id = href + rid; seen.add(id);
        const uid = (pr.UID && pr.UID.v) || "", own = uid.endsWith("@organize") ? uid.slice(0, -9) : null;
        await applyEvent(env, tz, now, { id, updated: etag, updatedAt: (pr["LAST-MODIFIED"] && dtParse(pr["LAST-MODIFIED"], tz) && new Date(dtParse(pr["LAST-MODIFIED"], tz).ms).toISOString()) || null,
          cancelled: !!(pr.STATUS && /CANCELLED/i.test(pr.STATUS.v)), summary: icsUnesc(pr.SUMMARY && pr.SUMMARY.v), notes: icsUnesc(pr.DESCRIPTION && pr.DESCRIPTION.v),
          w: whenOf(tz, pr, now), organizeId: own }, byG, tomb, st);
      }
    }
    // eventi spariti da questo calendario (dentro la finestra) = cancellati in iCloud
    for (const ex of Object.values(byG)) if (ex.gcal_id.startsWith(cal.path) && !seen.has(ex.gcal_id) && ex.due_date >= winA && ex.due_date <= winB) await removeLocal(env, ex);
    ctags[cal.path] = cal.ctag;
  }
  await env.DB.prepare("UPDATE items SET done = 1 WHERE gcal_src = 1 AND done = 0 AND due_date IS NOT NULL AND due_date < ?").bind(localParts(tz, now).date).run();
  await setSetting(env, "cd_ctags", JSON.stringify(ctags)); if (full) await setSetting(env, "cd_last_full", String(now));
}

// ---------- Organize → iCloud ----------
function bodyLines(tz, it) {
  const L = [];
  if (it.due_time) {
    const s = localToUtc(tz, it.due_date, it.due_time), mins = spanMins(it);
    L.push("DTSTART:" + icsUtc(s), "DTEND:" + icsUtc(s + mins * 60000));
  } else {
    const days = it.gcal_span && /^d/.test(it.gcal_span) ? Math.max(1, +it.gcal_span.slice(1) || 1) : 1;
    const end = new Date(Date.parse(it.due_date + "T12:00:00Z") + days * 864e5).toISOString().slice(0, 10);
    L.push("DTSTART;VALUE=DATE:" + it.due_date.replace(/-/g, ""), "DTEND;VALUE=DATE:" + end.replace(/-/g, ""));
  }
  L.push(fold("SUMMARY:" + icsEsc((it.done && !it.gcal_src ? "✓ " : "") + it.text)));
  if (it.notes) L.push(fold("DESCRIPTION:" + icsEsc(it.notes)));
  return L;
}
function alarm(tz, it) {
  const at = it.gcal_src || it.done ? null : computeRemindAt(tz, it);
  return at ? ["BEGIN:VALARM", "ACTION:DISPLAY", fold("DESCRIPTION:" + icsEsc(it.text)), "TRIGGER;VALUE=DATE-TIME:" + icsUtc(Date.parse(at)), "END:VALARM"] : [];
}
function newIcs(tz, it) {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Organize//IT", "BEGIN:VEVENT", `UID:${it.id}@organize`, "DTSTAMP:" + icsUtc(Date.now()), ...bodyLines(tz, it)];
  if (!it.due_time) L.push("TRANSP:TRANSPARENT");
  L.push(...alarm(tz, it), "END:VEVENT", "END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}
// aggiorna solo titolo, note, data e ora dell'evento esistente: il resto (luogo, invitati...) resta com'è
function patchIcs(tz, ics, it) {
  const t = unfold(ics);
  const i = t.indexOf("BEGIN:VEVENT"), j = t.indexOf("END:VEVENT", i);
  if (i < 0 || j < 0) return null;
  let ev = t.slice(i, j).replace(/BEGIN:VALARM[\s\S]*?END:VALARM\r?\n?/g, "");
  ev = ev.split(/\r?\n/).filter(l => !/^(SUMMARY|DESCRIPTION|DTSTART|DTEND|DURATION|DTSTAMP)[;:]/i.test(l)).filter(Boolean).join("\r\n");
  return t.slice(0, i) + ev + "\r\n" + ["DTSTAMP:" + icsUtc(Date.now()), ...bodyLines(tz, it), ...alarm(tz, it)].join("\r\n") + "\r\n" + t.slice(j);
}

async function push(env, tz) {
  const home = await getSetting(env, "cd_home"), cal = await getSetting(env, "cd_cal");
  for (const t of (await env.DB.prepare("SELECT gcal_id FROM gcal_tomb WHERE remote = 1 LIMIT ?").bind(BATCH).all()).results) {
    const r = await dav(env, "DELETE", abs(home, t.gcal_id));
    if ([200, 204, 404, 410].includes(r.status)) await env.DB.prepare("DELETE FROM gcal_tomb WHERE gcal_id = ?").bind(t.gcal_id).run();
    else throw new Error("iCloud ha risposto " + r.status);
  }
  const cutoff = localParts(tz, Date.now() - BACK_DAYS * 864e5).date;
  const rows = (await env.DB.prepare(
    `SELECT id, text, notes, due_date, due_time, due_end, remind, done, updated_at, gcal_id, gcal_span, gcal_src FROM items
     WHERE parent != '' AND deleted_at IS NULL AND (gcal_span IS NULL OR substr(gcal_span, 1, 1) != 'R') AND (
       (due_date IS NOT NULL AND (gcal_id IS NOT NULL OR due_date >= ?) AND (gcal_id IS NULL OR gcal_sync_at IS NULL OR gcal_sync_at != updated_at))
       OR (due_date IS NULL AND gcal_id IS NOT NULL))
     ORDER BY updated_at LIMIT ?`).bind(cutoff, BATCH).all()).results;
  for (const it of rows) {
    if (!it.due_date) {
      if (!it.gcal_src) await dav(env, "DELETE", abs(home, it.gcal_id));
      else await env.DB.prepare("INSERT OR IGNORE INTO gcal_tomb (gcal_id, remote, at) VALUES (?, 0, ?)").bind(it.gcal_id, nowIso()).run();
      await env.DB.prepare("UPDATE items SET gcal_id = NULL, gcal_updated = NULL, gcal_sync_at = NULL WHERE id = ?").bind(it.id).run();
      continue;
    }
    let res = null, href = it.gcal_id;
    if (href) {
      const g = await dav(env, "GET", abs(home, href));
      if (g.status === 200) {
        const ics = patchIcs(tz, g.text, it);
        if (ics) res = await dav(env, "PUT", abs(home, href), { body: ics, headers: g.etag ? { "if-match": g.etag } : {} });
        if (res && res.status === 412) continue;               // è cambiato nel frattempo: ci riprovo al prossimo giro
      }
    }
    if (!res || res.status === 404) {
      href = new URL(`${cal.replace(/\/?$/, "/")}${it.id}.ics`, home).pathname;
      res = await dav(env, "PUT", abs(home, href), { body: newIcs(tz, it), headers: { "if-none-match": "*" } });
    }
    if (res.status >= 300) throw new Error("iCloud ha risposto " + res.status);
    await env.DB.prepare("UPDATE items SET gcal_id = ?, gcal_updated = ?, gcal_sync_at = ? WHERE id = ?").bind(href, res.etag || null, it.updated_at, it.id).run();
  }
  return rows.length;
}

export async function run(env, { full = false, pushOnly = false } = {}) {
  if (!(await getSetting(env, "cd_cal"))) return { ok: false, error: "iCloud non collegato" };
  if (!(await lock(env))) return { ok: true, busy: true };
  try {
    const tz = (await getSetting(env, "tz")) || "Europe/Rome";
    if (!pushOnly) await pull(env, tz, full);
    const pushed = await push(env, tz);
    if (!pushOnly || pushed) await setSetting(env, "cd_last_sync", nowIso());
    await setSetting(env, "cd_error", "");
    return { ok: true };
  } catch (e) {
    console.log("caldav", e.message);
    await setSetting(env, "cd_error", String(e.message).slice(0, 200));
    return { ok: false, error: e.message };
  } finally { await setSetting(env, "g_lock", "0"); }
}
