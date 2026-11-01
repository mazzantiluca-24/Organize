import { generateVapid, sendPush, b64u } from "./webpush.js";

const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const nowIso = () => new Date().toISOString();
const rand = (n = 24) => b64u.enc(crypto.getRandomValues(new Uint8Array(n)));

// ---------- settings ----------
async function getSetting(env, k) {
  const r = await env.DB.prepare("SELECT v FROM settings WHERE k = ?").bind(k).first();
  return r ? r.v : null;
}
const setSetting = (env, k, v) => env.DB.prepare("INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, v).run();
async function ensureSetting(env, k, make) {
  let v = await getSetting(env, k);
  if (v === null) { v = await make(); await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)").bind(k, v).run(); v = await getSetting(env, k); }
  return v;
}
async function vapid(env) {
  const v = await ensureSetting(env, "vapid", async () => JSON.stringify(await generateVapid()));
  return JSON.parse(v);
}

// ---------- auth ----------
async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? b64u.dec(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return b64u.enc(salt) + "." + b64u.enc(bits);
}
async function sign(env, msg) {
  const secret = await ensureSetting(env, "session_secret", () => rand(32));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u.enc(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function makeSession(env) {
  const exp = Date.now() + 365 * 864e5;
  const ver = (await getSetting(env, "session_ver")) || "1";
  const val = exp + "." + ver;
  return val + "." + (await sign(env, val));
}
async function isAuthed(req, env) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)s=([^;]+)/);
  if (!m) return false;
  const [exp, ver, sig] = m[1].split(".");
  if (!sig || Number(exp) < Date.now()) return false;
  if (ver !== ((await getSetting(env, "session_ver")) || "1")) return false;
  return sig === (await sign(env, exp + "." + ver));
}
const cookie = v => `s=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${365 * 86400}`;

// ---------- time ----------
function tzOffsetMin(tz, ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - ms) / 60000);
}
// local wall time in tz -> UTC ms
function localToUtc(tz, date, time) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time || "00:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - tzOffsetMin(tz, guess) * 60000;
  t = guess - tzOffsetMin(tz, t) * 60000;
  return t;
}
const MORNING = "09:00";
function computeRemindAt(tz, it) {
  if (!it.due_date || !it.remind || it.remind === "none") return null;
  const base = it.due_time || MORNING;
  let ms;
  switch (it.remind) {
    case "at": ms = localToUtc(tz, it.due_date, base); break;
    case "morning": ms = localToUtc(tz, it.due_date, MORNING); break;
    case "15m": ms = localToUtc(tz, it.due_date, base) - 15 * 60000; break;
    case "1h": ms = localToUtc(tz, it.due_date, base) - 60 * 60000; break;
    case "1d": ms = localToUtc(tz, it.due_date, base) - 24 * 3600000; break;
    default: return null;
  }
  return new Date(ms).toISOString();
}

// ---------- items ----------
const FIELDS = ["parent", "text", "ord", "done", "collapsed", "due_date", "due_time", "remind", "repeat", "notes", "color", "icon", "priority"];
function clean(it) {
  const s = v => (v === undefined || v === null || v === "" ? null : String(v).slice(0, 5000));
  return {
    id: String(it.id).slice(0, 64),
    parent: String(it.parent || "").slice(0, 64),
    text: String(it.text || "").slice(0, 500),
    ord: Number(it.ord) || 0,
    done: it.done ? 1 : 0,
    collapsed: it.collapsed ? 1 : 0,
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(it.due_date || "") ? it.due_date : null,
    due_time: /^\d{2}:\d{2}$/.test(it.due_time || "") ? it.due_time : null,
    priority: [1, 2, 3].includes(Number(it.priority)) ? Number(it.priority) : 0,
    remind: s(it.remind), repeat: s(it.repeat), notes: s(it.notes), color: s(it.color), icon: s(it.icon),
  };
}
async function sync(env, body) {
  const tz = (await getSetting(env, "tz")) || "Europe/Rome";
  const stmts = [];
  // a reminder whose time is already past when it is set is not sent (avoids an instant ping when adding to "Oggi")
  const past = new Date(Date.now() - 2 * 60000).toISOString();
  for (const raw of body.upsert || []) {
    if (!raw || !raw.id) continue;
    const it = clean(raw);
    const remindAt = it.done ? null : computeRemindAt(tz, it);
    stmts.push(env.DB.prepare(
      `INSERT INTO items (id, ${FIELDS.join(", ")}, remind_at, notified_at, updated_at)
       VALUES (?, ${FIELDS.map(() => "?").join(", ")}, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET ${FIELDS.map(f => `${f} = excluded.${f}`).join(", ")},
         notified_at = CASE WHEN items.remind_at IS excluded.remind_at THEN items.notified_at ELSE excluded.notified_at END,
         remind_at = excluded.remind_at, updated_at = excluded.updated_at`
    ).bind(it.id, ...FIELDS.map(f => it[f]), remindAt, remindAt && remindAt < past ? nowIso() : null, nowIso()));
  }
  for (const id of body.delete || []) stmts.push(env.DB.prepare("DELETE FROM items WHERE id = ?").bind(String(id)));
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
}

// ---------- push ----------
async function pushAll(env, origin, payload) {
  const subs = (await env.DB.prepare("SELECT * FROM push_subs").all()).results;
  const v = await vapid(env);
  let ok = 0;
  for (const s of subs) {
    try {
      const st = await sendPush(s, JSON.stringify(payload), v, origin);
      if (st === 404 || st === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(s.endpoint).run();
      else if (st < 300) ok++;
      else console.log("push status", st, s.endpoint.slice(0, 40));
    } catch (e) { console.log("push error", e.message); }
  }
  return { sent: ok, devices: subs.length };
}
async function pathOf(env, id) {
  const parts = [];
  let cur = id;
  for (let i = 0; i < 20 && cur; i++) {
    const r = await env.DB.prepare("SELECT parent, text FROM items WHERE id = ?").bind(cur).first();
    if (!r) break;
    if (cur !== id) parts.unshift(r.text);
    cur = r.parent;
  }
  return parts.join(" › ");
}
async function runReminders(env) {
  const origin = await getSetting(env, "origin");
  if (!origin) return;
  const due = (await env.DB.prepare(
    "SELECT * FROM items WHERE notified_at IS NULL AND done = 0 AND remind_at IS NOT NULL AND remind_at <= ? AND remind_at > ? ORDER BY remind_at LIMIT 20"
  ).bind(nowIso(), new Date(Date.now() - 2 * 864e5).toISOString()).all()).results;
  for (const it of due) {
    await env.DB.prepare("UPDATE items SET notified_at = ? WHERE id = ?").bind(nowIso(), it.id).run();
    const when = it.due_time ? `alle ${it.due_time}` : "";
    const tz = (await getSetting(env, "tz")) || "Europe/Rome";
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
    const dayWord = it.due_date === today ? "Oggi" : it.due_date > today ? "Scade il " + it.due_date.split("-").reverse().slice(0, 2).join("/") : "Scaduta";
    const path = await pathOf(env, it.id);
    await pushAll(env, origin, { title: it.text, body: [dayWord + (when ? " " + when : ""), path].filter(Boolean).join(" · "), tag: it.id, url: "/#i-" + it.id });
  }
}

// ---------- calendar ----------
function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function fold(line) { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = " " + line.slice(74); } out.push(line); return out.join("\r\n"); }
const icsUtc = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
async function calendar(env) {
  const tz = (await getSetting(env, "tz")) || "Europe/Rome";
  const rows = (await env.DB.prepare("SELECT id, parent, text, notes, due_date, due_time, done, updated_at FROM items WHERE due_date IS NOT NULL").all()).results;
  const all = (await env.DB.prepare("SELECT id, parent, text FROM items").all()).results;
  const byId = Object.fromEntries(all.map(r => [r.id, r]));
  const path = id => { const p = []; let c = byId[id]?.parent; for (let i = 0; c && byId[c] && i < 20; i++) { p.unshift(byId[c].text); c = byId[c].parent; } return p.join(" › "); };
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Organize//IT", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Organize", "X-PUBLISHED-TTL:PT15M", "REFRESH-INTERVAL;VALUE=DURATION:PT15M"];
  for (const r of rows) {
    L.push("BEGIN:VEVENT", "UID:" + r.id + "@organize", "DTSTAMP:" + icsUtc(Date.parse(r.updated_at) || Date.now()));
    if (r.due_time) {
      const s = localToUtc(tz, r.due_date, r.due_time);
      L.push("DTSTART:" + icsUtc(s), "DTEND:" + icsUtc(s + 30 * 60000));
    } else {
      const d = new Date(r.due_date + "T12:00:00Z"); const n = new Date(d.getTime() + 864e5).toISOString().slice(0, 10);
      L.push("DTSTART;VALUE=DATE:" + r.due_date.replace(/-/g, ""), "DTEND;VALUE=DATE:" + n.replace(/-/g, ""), "TRANSP:TRANSPARENT");
    }
    const desc = [path(r.id), r.notes].filter(Boolean).join("\n\n");
    L.push(fold("SUMMARY:" + icsEscape((r.done ? "✓ " : "") + r.text)));
    if (desc) L.push(fold("DESCRIPTION:" + icsEscape(desc)));
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return new Response(L.join("\r\n") + "\r\n", { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "no-store" } });
}

// ---------- router ----------
async function api(req, env, url) {
  const p = url.pathname, m = req.method;
  const body = m === "POST" ? await req.json().catch(() => ({})) : {};
  const hasPw = !!(await getSetting(env, "pw_hash"));

  if (p === "/api/status") return json({ setup: !hasPw, authed: hasPw && (await isAuthed(req, env)) });
  if (p === "/api/setup" && m === "POST") {
    if (hasPw) return json({ error: "Già configurato" }, 400);
    if (!body.password || body.password.length < 6) return json({ error: "La password deve avere almeno 6 caratteri" }, 400);
    await setSetting(env, "pw_hash", await hashPassword(body.password));
    if (body.tz) await setSetting(env, "tz", String(body.tz).slice(0, 64));
    await setSetting(env, "origin", url.origin);
    return json({ ok: true }, 200, { "set-cookie": cookie(await makeSession(env)) });
  }
  if (p === "/api/login" && m === "POST") {
    const stored = await getSetting(env, "pw_hash");
    if (!stored) return json({ error: "Non configurato" }, 400);
    await new Promise(r => setTimeout(r, 400));
    const ok = (await hashPassword(String(body.password || ""), stored.split(".")[0])) === stored;
    if (!ok) return json({ error: "Password sbagliata" }, 401);
    await setSetting(env, "origin", url.origin);
    return json({ ok: true }, 200, { "set-cookie": cookie(await makeSession(env)) });
  }

  if (!(await isAuthed(req, env))) return json({ error: "Non autorizzato" }, 401);

  if (p === "/api/logout" && m === "POST") return json({ ok: true }, 200, { "set-cookie": "s=; Path=/; Max-Age=0; Secure; HttpOnly" });
  if (p === "/api/items" && m === "GET") {
    const rows = (await env.DB.prepare(`SELECT id, ${FIELDS.join(", ")} FROM items`).all()).results;
    return json({ items: rows });
  }
  if (p === "/api/sync" && m === "POST") { await sync(env, body); return json({ ok: true }); }
  if (p === "/api/settings" && m === "GET") {
    const calToken = await ensureSetting(env, "cal_token", () => rand(18));
    const devices = (await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subs").first()).n;
    return json({ vapidKey: (await vapid(env)).publicKey, calendarUrl: `${url.origin}/cal/${calToken}.ics`, tz: (await getSetting(env, "tz")) || "Europe/Rome", devices });
  }
  if (p === "/api/push/subscribe" && m === "POST") {
    const s = body.subscription;
    if (!s || !s.endpoint || !s.keys) return json({ error: "Iscrizione non valida" }, 400);
    await env.DB.prepare("INSERT INTO push_subs (endpoint, p256dh, auth, label, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, label = excluded.label")
      .bind(s.endpoint, s.keys.p256dh, s.keys.auth, String(body.label || "").slice(0, 100), nowIso()).run();
    return json({ ok: true });
  }
  if (p === "/api/push/test" && m === "POST") {
    return json(await pushAll(env, url.origin, { title: "Organize", body: "Gli avvisi funzionano 👍", tag: "test", url: "/" }));
  }
  if (p === "/api/password" && m === "POST") {
    if (!body.password || body.password.length < 6) return json({ error: "La password deve avere almeno 6 caratteri" }, 400);
    await setSetting(env, "pw_hash", await hashPassword(body.password));
    const ver = String(Number((await getSetting(env, "session_ver")) || "1") + 1);
    await setSetting(env, "session_ver", ver);
    return json({ ok: true }, 200, { "set-cookie": cookie(await makeSession(env)) });
  }
  return json({ error: "Non trovato" }, 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith("/api/")) return await api(req, env, url);
      const cal = url.pathname.match(/^\/cal\/([\w-]+)\.ics$/);
      if (cal) {
        const t = await getSetting(env, "cal_token");
        if (!t || t !== cal[1]) return new Response("Not found", { status: 404 });
        return await calendar(env);
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.log("error", e.stack || e.message);
      return json({ error: "Errore del server" }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env));
  },
};
