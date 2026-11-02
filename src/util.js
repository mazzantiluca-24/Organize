import { b64u } from "./webpush.js";

export const enc = new TextEncoder();
export const nowIso = () => new Date().toISOString();
export const rand = (n = 24) => b64u.enc(crypto.getRandomValues(new Uint8Array(n)));

// ---------- settings ----------
export async function getSetting(env, k) {
  const r = await env.DB.prepare("SELECT v FROM settings WHERE k = ?").bind(k).first();
  return r ? r.v : null;
}
export const setSetting = (env, k, v) => env.DB.prepare("INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, v).run();
export async function ensureSetting(env, k, make) {
  let v = await getSetting(env, k);
  if (v === null) { v = await make(); await env.DB.prepare("INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)").bind(k, v).run(); v = await getSetting(env, k); }
  return v;
}
export async function sign(env, msg) {
  const secret = await ensureSetting(env, "session_secret", () => rand(32));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u.enc(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// ---------- time ----------
export function tzOffsetMin(tz, ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - ms) / 60000);
}
// local wall time in tz -> UTC ms
export function localToUtc(tz, date, time) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = (time || "00:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let t = guess - tzOffsetMin(tz, guess) * 60000;
  t = guess - tzOffsetMin(tz, t) * 60000;
  return t;
}
export const MORNING = "09:00";
export function computeRemindAt(tz, it) {
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


// local date/time parts of an instant, in the user's timezone
export function localParts(tz, ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
