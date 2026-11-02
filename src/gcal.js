// Sincronizzazione a due vie con Google Calendar (calendario principale).
//  - Organize → Google: ogni voce con una data diventa un evento (con l'avviso scelto).
//  - Google → Organize: gli eventi del calendario compaiono nella categoria "Google Calendar".
// Il collegamento usa il login Google (OAuth) con le chiavi che Luca crea una volta sola e incolla nelle Impostazioni.
import { getSetting, setSetting, nowIso, rand, sign, localToUtc, localParts, computeRemindAt, spanMins, endOf } from "./util.js";

const apiBase = env => env.GOOGLE_API_BASE || "https://www.googleapis.com/calendar/v3";
const tokenUrl = env => env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token";
const authUrl = env => env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth";
export const CAT_ID = "cat-gcal";
const BACK_DAYS = 7, FWD_DAYS = 60;      // finestra di eventi importati da Google
const PUSH_BATCH = 15;                   // voci spedite a Google per giro (il cron gira ogni minuto; Cloudflare gratis ammette 50 chiamate esterne per giro)
export const redirectUri = url => url.origin + "/api/google/callback";

// ---------- schema (aggiunto da solo, così un deploy non dipende da una migrazione a mano) ----------
let schemaOk = false;
export async function ensureSchema(env) {
  if (schemaOk) return;
  const cols = (await env.DB.prepare("PRAGMA table_info(items)").all()).results.map(r => r.name);
  const add = [["gcal_id", "TEXT"], ["gcal_updated", "TEXT"], ["gcal_sync_at", "TEXT"], ["gcal_span", "TEXT"], ["due_end", "TEXT"], ["gcal_src", "INTEGER NOT NULL DEFAULT 0"]];
  for (const [c, t] of add) if (!cols.includes(c)) { try { await env.DB.prepare(`ALTER TABLE items ADD COLUMN ${c} ${t}`).run(); } catch (_) { /* creata in parallelo */ } }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS items_gcal ON items(gcal_id)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS gcal_tomb (gcal_id TEXT PRIMARY KEY, remote INTEGER NOT NULL DEFAULT 1, at TEXT)").run();
  schemaOk = true;
}

// ---------- stato mostrato nelle Impostazioni ----------
export async function status(env, url) {
  const [id, secret, refresh, email, last, err] = await Promise.all(["g_client_id", "g_client_secret", "g_refresh", "g_email", "g_last_sync", "g_error"].map(k => getSetting(env, k)));
  return { configured: !!(id && secret), connected: !!refresh, clientId: id || "", email: email || "", lastSync: last || "", error: err || "", redirectUri: redirectUri(url) };
}
export async function saveConfig(env, body) {
  const id = String(body.clientId || "").trim(), secret = String(body.clientSecret || "").trim();
  if (!/\.apps\.googleusercontent\.com$/.test(id)) throw new Error("L'ID client deve finire con .apps.googleusercontent.com");
  if (secret.length < 10) throw new Error("Il segreto client sembra incompleto");
  await setSetting(env, "g_client_id", id); await setSetting(env, "g_client_secret", secret);
}

// ---------- login Google (OAuth) ----------
export async function startUrl(env, url) {
  const id = await getSetting(env, "g_client_id");
  if (!id || !(await getSetting(env, "g_client_secret"))) return null;
  const ts = Date.now(), nonce = rand(12);
  const state = `${ts}.${nonce}.${await sign(env, `g:${ts}.${nonce}`)}`;
  const q = new URLSearchParams({ client_id: id, redirect_uri: redirectUri(url), response_type: "code", scope: "openid email https://www.googleapis.com/auth/calendar", access_type: "offline", prompt: "consent", state });
  return authUrl(env) + "?" + q;
}
export async function callback(env, url) {
  const q = url.searchParams;
  if (q.get("error") || !q.get("code")) return false;
  const [ts, nonce, sig] = String(q.get("state") || "").split(".");
  if (!sig || Date.now() - Number(ts) > 15 * 60000 || sig !== (await sign(env, `g:${ts}.${nonce}`))) return false;
  const r = await fetch(tokenUrl(env), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: q.get("code"), client_id: await getSetting(env, "g_client_id"), client_secret: await getSetting(env, "g_client_secret"), redirect_uri: redirectUri(url), grant_type: "authorization_code" }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.refresh_token) { console.log("google token", r.status, d.error, d.error_description); return false; }
  await setSetting(env, "g_refresh", d.refresh_token);
  await setSetting(env, "g_access", d.access_token); await setSetting(env, "g_access_exp", String(Date.now() + (d.expires_in || 3000) * 1000));
  let email = "";
  try { email = JSON.parse(atob(d.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || ""; } catch (_) {}
  await setSetting(env, "g_email", email); await setSetting(env, "g_error", "");
  await env.DB.prepare("DELETE FROM settings WHERE k IN ('g_last_pull', 'g_last_full')").run();   // primo giro = import completo
  return true;
}
export async function disconnect(env) {
  const t = await getSetting(env, "g_refresh");
  if (t) { try { await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: t }) }); } catch (_) {} }
  await env.DB.prepare("DELETE FROM settings WHERE k IN ('g_refresh', 'g_access', 'g_access_exp', 'g_email', 'g_last_pull', 'g_last_full', 'g_last_sync', 'g_error')").run();
}

async function accessToken(env, force) {
  const cur = await getSetting(env, "g_access"), exp = Number((await getSetting(env, "g_access_exp")) || 0);
  if (!force && cur && exp > Date.now() + 60000) return cur;
  const refresh = await getSetting(env, "g_refresh");
  if (!refresh) throw new Error("Google non collegato");
  const r = await fetch(tokenUrl(env), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: await getSetting(env, "g_client_id"), client_secret: await getSetting(env, "g_client_secret"), refresh_token: refresh, grant_type: "refresh_token" }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (d.error === "invalid_grant") { await env.DB.prepare("DELETE FROM settings WHERE k IN ('g_refresh', 'g_access', 'g_access_exp')").run(); throw new Error("Il collegamento con Google è scaduto: ricollegalo."); }
    throw new Error("Google non risponde (" + (d.error || r.status) + ")");
  }
  await setSetting(env, "g_access", d.access_token); await setSetting(env, "g_access_exp", String(Date.now() + (d.expires_in || 3000) * 1000));
  return d.access_token;
}
async function gfetch(env, path, init = {}, retried = false) {
  const tok = await accessToken(env, retried);
  const r = await fetch(apiBase(env) + path, { ...init, headers: { authorization: "Bearer " + tok, "content-type": "application/json", ...(init.headers || {}) } });
  if (r.status === 401 && !retried) return gfetch(env, path, init, true);
  const data = r.status === 204 ? {} : await r.json().catch(() => ({}));
  return { status: r.status, data };
}
const evPath = id => `/calendars/primary/events/${encodeURIComponent(id)}`;

// ---------- evento Google → data/ora di Organize ----------
function evWhen(tz, ev, now) {
  const s = ev.start || {}, e = ev.end || {};
  if (s.date) {
    const days = e.date ? Math.max(1, Math.round((Date.parse(e.date) - Date.parse(s.date)) / 864e5)) : 1;
    return { date: s.date, time: null, span: "d" + days, ms: Date.parse(s.date + "T12:00:00Z"), past: (e.date || s.date) <= localParts(tz, now).date };
  }
  if (!s.dateTime) return null;
  const sm = Date.parse(s.dateTime), em = e.dateTime ? Date.parse(e.dateTime) : sm + 30 * 60000;
  if (isNaN(sm)) return null;
  const p = localParts(tz, sm);
  return { date: p.date, time: p.time, span: "m" + Math.max(5, Math.round((em - sm) / 60000)), ms: sm, past: em < now };
}

export async function ensureCategory(env) {
  if (await env.DB.prepare("SELECT 1 FROM items WHERE id = ?").bind(CAT_ID).first()) return;
  const m = (await env.DB.prepare("SELECT COALESCE(MAX(ord), 0) AS m FROM items WHERE parent = ''").first()).m;
  await env.DB.prepare("INSERT OR IGNORE INTO items (id, parent, text, ord, color, icon, updated_at) VALUES (?, '', 'Calendario', ?, '#007aff', '📅', ?)").bind(CAT_ID, m + 1, nowIso()).run();
}
export async function removeLocal(env, ex) {
  const kids = (await env.DB.prepare("SELECT COUNT(*) AS n FROM items WHERE parent = ?").bind(ex.id).first()).n;
  if (!kids) await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(ex.id).run();
  else await env.DB.prepare("UPDATE items SET gcal_id = NULL, gcal_updated = NULL, gcal_sync_at = NULL, due_date = NULL, due_time = NULL, remind_at = NULL, updated_at = ? WHERE id = ?").bind(nowIso(), ex.id).run();
}

// Applica un evento remoto (già normalizzato) alle voci di Organize. Usata anche dal collegamento iCloud.
export async function applyEvent(env, tz, now, n, byG, tomb, st) {
  const ex = byG[n.id];
  if (n.cancelled) { if (ex) await removeLocal(env, ex); return; }
  if (tomb.has(n.id)) return;
  const w = n.w; if (!w) return;
  const lateCut = new Date(now - 2 * 60000).toISOString();
  let text = String(n.summary || "").trim(), tick = false;
  if (text.startsWith("✓ ")) { text = text.slice(2).trim(); tick = true; }
  text = (text || "(senza titolo)").slice(0, 500);
  const notes = n.notes ? String(n.notes).slice(0, 5000) : null;
  const stamp = nowIso();
  if (ex) {
    if (ex.gcal_updated === n.updated) return;                                                         // è l'eco di quello che abbiamo appena mandato noi
    if (ex.updated_at !== ex.gcal_sync_at && Date.parse(ex.updated_at) > Date.parse(n.updatedAt || 0)) return;   // in Organize è più recente: vince Organize
    const done = ex.gcal_src ? (w.past ? 1 : ex.done) : (tick ? 1 : 0);
    const remindAt = done ? null : computeRemindAt(tz, { due_date: w.date, due_time: w.time, remind: ex.remind });
    await env.DB.prepare(`UPDATE items SET text = ?, notes = ?, due_date = ?, due_time = ?, due_end = ?, done = ?, remind_at = ?,
        notified_at = CASE WHEN remind_at IS ? THEN notified_at ELSE ? END, updated_at = ?, gcal_updated = ?, gcal_sync_at = ?, gcal_span = ? WHERE id = ?`)
      .bind(text, notes, w.date, w.time, w.time ? endOf(w.time, +w.span.replace(/^R?m/, "") || 30) : null, done, remindAt, remindAt, remindAt && remindAt < lateCut ? stamp : null, stamp, n.updated || null, stamp, w.span, ex.id).run();
    return;
  }
  const oid = n.organizeId;
  if (oid) {   // evento nato da Organize ma non ancora collegato (es. interruzione a metà): lo ricollego, il prossimo giro lo allinea
    const own = await env.DB.prepare("SELECT id FROM items WHERE id = ? AND gcal_id IS NULL").bind(oid).first();
    if (own) { await env.DB.prepare("UPDATE items SET gcal_id = ?, gcal_updated = ?, gcal_sync_at = NULL WHERE id = ?").bind(n.id, n.updated || null, oid).run(); return; }
    if (await env.DB.prepare("SELECT 1 FROM items WHERE id = ?").bind(oid).first()) return;
  }
  if (!st.catOk) { await ensureCategory(env); st.catOk = true; }
  await env.DB.prepare(`INSERT INTO items (id, parent, text, ord, done, collapsed, due_date, due_time, due_end, notes, priority, updated_at, gcal_id, gcal_updated, gcal_sync_at, gcal_span, gcal_src)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1)`)
    .bind(rand(9), CAT_ID, text, w.ms / 1e6, w.past ? 1 : 0, w.date, w.time, w.time ? endOf(w.time, +w.span.replace(/^R?m/, "") || 30) : null, notes, stamp, n.id, n.updated || null, stamp, w.span).run();
}


// ---------- Google → Organize ----------
async function pull(env, tz, forceFull) {
  const lastPull = await getSetting(env, "g_last_pull");
  const lastFull = Number((await getSetting(env, "g_last_full")) || 0);
  const full = forceFull || !lastPull || Date.now() - lastFull > 6 * 3600e3;   // ogni tanto riguardo tutta la finestra (scorre in avanti con i giorni)
  const startedAt = nowIso(), now = Date.now();
  const q = new URLSearchParams({ singleEvents: "true", maxResults: "250", timeMin: new Date(now - BACK_DAYS * 864e5).toISOString(), timeMax: new Date(now + FWD_DAYS * 864e5).toISOString() });
  if (!full) { q.set("updatedMin", new Date(Date.parse(lastPull) - 2 * 60000).toISOString()); q.set("showDeleted", "true"); }
  const evs = []; let page = null, complete = false;
  for (let i = 0; i < 4; i++) {
    if (page) q.set("pageToken", page);
    const r = await gfetch(env, `/calendars/primary/events?${q}`);
    if (r.status !== 200) throw new Error("Google ha risposto " + r.status + (r.data.error && r.data.error.message ? ": " + r.data.error.message : ""));
    evs.push(...(r.data.items || [])); page = r.data.nextPageToken;
    if (!page) { complete = true; break; }
  }
  const byG = Object.fromEntries((await env.DB.prepare("SELECT id, text, done, remind, updated_at, gcal_id, gcal_updated, gcal_sync_at, gcal_src FROM items WHERE gcal_id IS NOT NULL").all()).results.map(r => [r.gcal_id, r]));
  const tomb = new Set((await env.DB.prepare("SELECT gcal_id FROM gcal_tomb").all()).results.map(r => r.gcal_id));
  const st = { catOk: false };
  for (const ev of evs) {
    if (!ev.id) continue;
    const cancelled = ev.status === "cancelled";
    await applyEvent(env, tz, now, { id: ev.id, updated: ev.updated, cancelled, summary: ev.summary, notes: ev.description, w: cancelled ? null : evWhen(tz, ev, now),
      updatedAt: ev.updated, organizeId: ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.organizeId }, byG, tomb, st);
  }
  // gli eventi di Google già passati non sono "scadenze": li segno come fatti, senza mandarli a Google
  await env.DB.prepare("UPDATE items SET done = 1 WHERE gcal_src = 1 AND done = 0 AND due_date IS NOT NULL AND due_date < ?").bind(localParts(tz, now).date).run();
  if (complete) { await setSetting(env, "g_last_pull", startedAt); if (full) await setSetting(env, "g_last_full", String(now)); }
}

// ---------- Organize → Google ----------
function reminders(it) {
  const none = { useDefault: false, overrides: [] };
  if (it.done || !it.remind || it.remind === "none" || !it.due_time) return none;   // senza ora: l'avviso lo manda Organize (alle 9)
  const [h, m] = it.due_time.split(":").map(Number);
  const min = { at: 0, "15m": 15, "1h": 60, "1d": 1440 }[it.remind] ?? (it.remind === "morning" ? Math.max(0, h * 60 + m - 9 * 60) : null);
  return min === null ? none : { useDefault: false, overrides: [{ method: "popup", minutes: min }] };
}
function eventBody(tz, it, creating) {
  const own = !it.gcal_src;
  const b = { summary: (it.done && own ? "✓ " : "") + it.text, description: it.notes || "", extendedProperties: { private: { organizeId: it.id } } };
  if (own) b.reminders = reminders(it);       // gli eventi arrivati da Google tengono i loro avvisi
  if (it.due_time) {
    const s = localToUtc(tz, it.due_date, it.due_time), mins = spanMins(it);
    b.start = { dateTime: new Date(s).toISOString(), timeZone: tz, date: null };
    b.end = { dateTime: new Date(s + mins * 60000).toISOString(), timeZone: tz, date: null };
  } else {
    const days = it.gcal_span && it.gcal_span[0] === "d" ? Math.max(1, +it.gcal_span.slice(1) || 1) : 1;
    b.start = { date: it.due_date, dateTime: null, timeZone: null };
    b.end = { date: new Date(Date.parse(it.due_date + "T12:00:00Z") + days * 864e5).toISOString().slice(0, 10), dateTime: null, timeZone: null };
    if (creating && own) b.transparency = "transparent";    // una scadenza senza ora non deve segnarti "occupato"
  }
  return b;
}
const noNulls = o => JSON.stringify(o, (k, v) => (v === null ? undefined : v));

async function push(env, tz) {
  // 1) voci cancellate in Organize → via anche l'evento (solo se l'avevo creato io)
  for (const t of (await env.DB.prepare("SELECT gcal_id FROM gcal_tomb WHERE remote = 1 LIMIT ?").bind(PUSH_BATCH).all()).results) {
    const r = await gfetch(env, evPath(t.gcal_id), { method: "DELETE" });
    if ([200, 204, 404, 410].includes(r.status)) await env.DB.prepare("DELETE FROM gcal_tomb WHERE gcal_id = ?").bind(t.gcal_id).run();
    else throw new Error("Google ha risposto " + r.status);
  }
  // 2) voci nuove o cambiate (non spedisco lo storico vecchio di più di una settimana)
  const cutoff = localParts(tz, Date.now() - BACK_DAYS * 864e5).date;
  const rows = (await env.DB.prepare(
    `SELECT id, text, notes, due_date, due_time, due_end, remind, done, updated_at, gcal_id, gcal_span, gcal_src FROM items
     WHERE parent != '' AND (
       (due_date IS NOT NULL AND (gcal_id IS NOT NULL OR due_date >= ?) AND (gcal_id IS NULL OR gcal_sync_at IS NULL OR gcal_sync_at != updated_at))
       OR (due_date IS NULL AND gcal_id IS NOT NULL))
     ORDER BY updated_at LIMIT ?`).bind(cutoff, PUSH_BATCH).all()).results;
  for (const it of rows) {
    if (!it.due_date) {          // data tolta in Organize → scollego (e cancello l'evento solo se l'avevo creato io)
      if (!it.gcal_src) await gfetch(env, evPath(it.gcal_id), { method: "DELETE" });
      else await env.DB.prepare("INSERT OR IGNORE INTO gcal_tomb (gcal_id, remote, at) VALUES (?, 0, ?)").bind(it.gcal_id, nowIso()).run();
      await env.DB.prepare("UPDATE items SET gcal_id = NULL, gcal_updated = NULL, gcal_sync_at = NULL WHERE id = ?").bind(it.id).run();
      continue;
    }
    let r = null;
    if (it.gcal_id) {
      r = await gfetch(env, evPath(it.gcal_id), { method: "PATCH", body: JSON.stringify(eventBody(tz, it, false)) });
      if (r.status === 404 || r.status === 410) r = null;      // l'evento non c'è più: lo ricreo
    }
    if (!r) r = await gfetch(env, "/calendars/primary/events", { method: "POST", body: noNulls(eventBody(tz, it, true)) });
    if (r.status !== 200) throw new Error("Google ha risposto " + r.status + (r.data.error && r.data.error.message ? ": " + r.data.error.message : ""));
    await env.DB.prepare("UPDATE items SET gcal_id = ?, gcal_updated = ?, gcal_sync_at = ? WHERE id = ?").bind(r.data.id, r.data.updated || null, it.updated_at, it.id).run();
  }
  return rows.length;
}

// ---------- un giro completo ----------
export async function lock(env) {
  const now = Date.now();
  await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES ('g_lock', '0')").run();
  const r = await env.DB.prepare("UPDATE settings SET v = ? WHERE k = 'g_lock' AND CAST(v AS INTEGER) < ?").bind(String(now + 90000), now).run();
  return r.meta.changes > 0;
}
export async function run(env, { full = false, pushOnly = false } = {}) {
  if (!(await getSetting(env, "g_refresh"))) return { ok: false, error: "Google non collegato" };
  if (!(await lock(env))) return { ok: true, busy: true };
  try {
    const tz = (await getSetting(env, "tz")) || "Europe/Rome";
    if (!pushOnly) await pull(env, tz, full);
    const pushed = await push(env, tz);
    if (!pushOnly || pushed) await setSetting(env, "g_last_sync", nowIso());
    await setSetting(env, "g_error", "");
    return { ok: true };
  } catch (e) {
    console.log("gcal", e.message);
    await setSetting(env, "g_error", String(e.message).slice(0, 200));
    return { ok: false, error: e.message };
  } finally { await setSetting(env, "g_lock", "0"); }
}
