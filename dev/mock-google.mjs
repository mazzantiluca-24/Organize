// Finto Google: token + Calendar API (solo quello che serve ai test)
import http from "node:http";
let seq = 0, tick = 0, evs = [], log = [];
const now = () => new Date(Date.now() + (tick++)).toISOString();   // monotono, al millisecondo
const body = req => new Promise(r => { let b = ""; req.on("data", c => b += c); req.on("end", () => r(b)); });
const send = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(obj === undefined ? "" : JSON.stringify(obj)); };
const merge = (t, p) => { for (const [k, v] of Object.entries(p)) { if (v === null) delete t[k]; else if (v && typeof v === "object" && !Array.isArray(v) && t[k] && typeof t[k] === "object") merge(t[k], v); else t[k] = v; } return t; };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), p = u.pathname, raw = await body(req);
  if (p === "/token") {
    const f = new URLSearchParams(raw); log.push("token:" + f.get("grant_type"));
    const idt = "h." + Buffer.from(JSON.stringify({ email: "luca@example.com" })).toString("base64url") + ".s";
    return send(res, 200, f.get("grant_type") === "authorization_code" ? { access_token: "at-" + (++seq), refresh_token: "rt-1", expires_in: 3600, id_token: idt } : { access_token: "at-" + (++seq), expires_in: 3600 });
  }
  if (p.startsWith("/calendar/v3/calendars/primary/events")) {
    if (!/^Bearer at-/.test(req.headers.authorization || "")) return send(res, 401, { error: { message: "no auth" } });
    const id = decodeURIComponent(p.split("/events/")[1] || "");
    log.push(req.method + " " + (id || "list"));
    if (req.method === "GET") {
      const q = u.searchParams, um = q.get("updatedMin"), sd = q.get("showDeleted") === "true";
      const out = evs.filter(e => (e.status !== "cancelled" || sd || um) && (!um || e.updated >= um) && (e.status === "cancelled" || (e.start.dateTime || e.start.date) >= q.get("timeMin").slice(0, 10)));
      return send(res, 200, { items: out });
    }
    if (req.method === "POST") { const e = JSON.parse(raw); e.id = "g" + (++seq); e.status = "confirmed"; e.updated = now(); evs.push(e); return send(res, 200, e); }
    const e = evs.find(x => x.id === id);
    if (!e || e.status === "cancelled") return send(res, 404, { error: { message: "not found" } });
    if (req.method === "PATCH") { merge(e, JSON.parse(raw)); e.updated = now(); return send(res, 200, e); }
    if (req.method === "DELETE") { e.status = "cancelled"; e.updated = now(); return send(res, 204); }
  }
  if (p === "/admin/events") return send(res, 200, { evs, log });
  if (p === "/admin/reset") { evs = []; log = []; return send(res, 200, {}); }
  if (p === "/admin/add") { const e = JSON.parse(raw); e.id = "g" + (++seq); e.status = "confirmed"; e.updated = now(); evs.push(e); return send(res, 200, e); }
  if (p.startsWith("/admin/update/")) { const e = evs.find(x => x.id === p.split("/").pop()); merge(e, JSON.parse(raw)); e.updated = now(); return send(res, 200, e); }
  if (p.startsWith("/admin/delete/")) { const e = evs.find(x => x.id === p.split("/").pop()); e.status = "cancelled"; e.updated = now(); return send(res, 200, e); }
  send(res, 404, { error: "?" });
}).listen(8799, () => console.log("mock google on 8799"));
