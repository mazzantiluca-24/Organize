// Finto iCloud CalDAV (solo quello che serve ai test). Utente a@b.it / password abcdabcdabcdabcd
import http from "node:http";
const HOME = "/123/calendars/";
let cals = { "/123/calendars/home/": { name: "Casa", ctag: 1, res: {} }, "/123/calendars/org1/": { name: "Organize", ctag: 1, res: {} } }, etagN = 0;
const body = req => new Promise(r => { let b = ""; req.on("data", c => b += c); req.on("end", () => r(b)); });
const ms = (res, xml) => { res.writeHead(207, { "content-type": "application/xml" }); res.end(`<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/">${xml}</d:multistatus>`); };
const calOf = p => Object.keys(cals).find(c => p.startsWith(c));
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
http.createServer(async (req, res) => {
  const p = new URL(req.url, "http://x").pathname, raw = await body(req), m = req.method;
  if (p.startsWith("/admin/")) {
    const j = raw ? JSON.parse(raw) : {};
    if (p === "/admin/put") { const c = cals[j.cal]; c.res[j.href] = { ics: j.ics, etag: '"' + (++etagN) + '"' }; c.ctag++; }
    if (p === "/admin/del") { const c = cals[j.cal]; delete c.res[j.href]; c.ctag++; }
    if (p === "/admin/dump") { res.end(JSON.stringify(cals)); return; }
    res.end("{}"); return;
  }
  if (req.headers.authorization !== "Basic " + Buffer.from("a@b.it:abcdabcdabcdabcd").toString("base64")) { res.writeHead(401); return res.end(); }
  if (m === "PROPFIND" && p === "/") return ms(res, `<d:response><d:href>/</d:href><d:propstat><d:prop><d:current-user-principal><d:href>/123/principal/</d:href></d:current-user-principal></d:prop></d:propstat></d:response>`);
  if (m === "PROPFIND" && p === "/123/principal/") return ms(res, `<d:response><d:href>${p}</d:href><d:propstat><d:prop><c:calendar-home-set><d:href>${HOME}</d:href></c:calendar-home-set></d:prop></d:propstat></d:response>`);
  if (m === "PROPFIND" && p === HOME) return ms(res, `<d:response><d:href>${HOME}</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>` + Object.entries(cals).map(([h, c]) => `<d:response><d:href>${h}</d:href><d:propstat><d:prop><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>${c.name}</d:displayname><cs:getctag>${c.ctag}</cs:getctag><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set></d:prop></d:propstat></d:response>`).join(""));
  if (m === "MKCALENDAR") { cals[p] = { name: (raw.match(/displayname>([^<]*)</) || [])[1] || "?", ctag: 1, res: {} }; res.writeHead(201); return res.end(); }
  const c = cals[calOf(p)]; if (!c) { res.writeHead(404); return res.end(); }
  if (m === "REPORT") return ms(res, Object.entries(c.res).map(([h, r]) => `<d:response><d:href>${h}</d:href><d:propstat><d:prop><d:getetag>${r.etag}</d:getetag><c:calendar-data>${esc(r.ics)}</c:calendar-data></d:prop></d:propstat></d:response>`).join(""));
  const r = c.res[p];
  if (m === "GET") { if (!r) { res.writeHead(404); return res.end(); } res.writeHead(200, { etag: r.etag, "content-type": "text/calendar" }); return res.end(r.ics); }
  if (m === "DELETE") { if (!r) { res.writeHead(404); return res.end(); } delete c.res[p]; c.ctag++; res.writeHead(204); return res.end(); }
  if (m === "PUT") {
    if (req.headers["if-none-match"] === "*" && r) { res.writeHead(412); return res.end(); }
    if (req.headers["if-match"] && (!r || r.etag !== req.headers["if-match"])) { res.writeHead(412); return res.end(); }
    const etag = '"' + (++etagN) + '"'; c.res[p] = { ics: raw, etag }; c.ctag++; res.writeHead(r ? 204 : 201, { etag }); return res.end();
  }
  res.writeHead(405); res.end();
}).listen(8798, () => console.log("mock caldav on 8798"));
