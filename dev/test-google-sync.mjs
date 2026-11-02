const B = "http://localhost:8787", G = "http://localhost:8799";
let cookie = "";
const call = async (path, body, opt = {}) => {
  const r = await fetch(B + path, { method: body === undefined ? "GET" : "POST", redirect: "manual", headers: { cookie, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), ...opt });
  const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0];
  return r;
};
const jget = async p => (await call(p)).json();
const gadmin = async (p, b) => (await fetch(G + p, { method: b ? "POST" : "GET", body: b ? JSON.stringify(b) : undefined })).json();
const tick = async () => { await fetch(B + "/cdn-cgi/local/explorer/api/local/scheduled?worker=organize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cron: "* * * * *" }) }); await new Promise(r => setTimeout(r, 600)); };
const items = async () => (await jget("/api/items")).items;
const byText = async t => (await items()).find(i => i.text === t);
let fails = 0; const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const iso = d => d.toISOString();
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

await call("/api/login", { password: "prova123" });
const st = await (await call("/api/status")).json(); ok(st.authed, "login ok");
const s0 = await jget("/api/settings"); const tz = s0.tz; console.log("tz", tz, "google", JSON.stringify(s0.google));
await gadmin("/admin/reset", {});

// ---- collegamento ----
let r = await call("/api/google/config", { clientId: "bad", clientSecret: "x" }); ok(r.status === 400, "config con ID sbagliato rifiutata");
r = await call("/api/google/config", { clientId: "123-abc.apps.googleusercontent.com", clientSecret: "supersecretvalue" }); ok(r.status === 200, "config salvata");
r = await call("/api/google/start"); const loc = r.headers.get("location"); ok(r.status === 302 && loc.startsWith(G + "/auth") && loc.includes("access_type=offline") && loc.includes("calendar"), "start -> redirect a Google con scope calendar");
const state = new URL(loc).searchParams.get("state");
r = await call("/api/google/callback?code=abc&state=" + encodeURIComponent(state + "x")); ok(r.headers.get("location").includes("google=err"), "stato manomesso rifiutato");
// eventi di Google prima del collegamento
const t1 = day(1) + "T10:00:00Z", t1e = day(1) + "T11:00:00Z";
await gadmin("/admin/add", { summary: "Dentista", description: "portare tessera", start: { dateTime: t1 }, end: { dateTime: t1e } });
await gadmin("/admin/add", { summary: "Compleanno Anna", start: { date: day(3) }, end: { date: day(4) } });
await gadmin("/admin/add", { summary: "Riunione passata", start: { dateTime: day(-2) + "T09:00:00Z" }, end: { dateTime: day(-2) + "T10:00:00Z" } });
await gadmin("/admin/add", { summary: "Vacanze", start: { date: day(5) }, end: { date: day(8) } });
r = await call("/api/google/callback?code=abc&state=" + encodeURIComponent(state)); ok(r.headers.get("location").includes("google=ok"), "callback ok");
await new Promise(r => setTimeout(r, 2500));
const s1 = await jget("/api/settings"); ok(s1.google.connected && s1.google.email === "luca@example.com", "collegato come " + s1.google.email);
let all = await items();
const cat = all.find(i => i.id === "cat-gcal"); ok(cat && cat.text === "Calendario", "categoria Google Calendar creata");
const dent = await byText("Dentista"); ok(dent && dent.parent === "cat-gcal" && dent.due_time && dent.notes === "portare tessera" && !dent.done, "Dentista importato con ora e note: " + JSON.stringify(dent && [dent.due_date, dent.due_time]));
const comp = await byText("Compleanno Anna"); ok(comp && comp.due_date === day(3) && !comp.due_time, "Compleanno importato (tutto il giorno)");
const past = await byText("Riunione passata"); ok(past && past.done === 1, "evento passato importato come fatto");
const vac = await byText("Vacanze"); ok(vac && vac.due_date === day(5), "evento di più giorni importato sul primo giorno");

// ---- Organize -> Google ----
const mine = { id: "mio1", parent: "cat-auto", text: "Tagliando auto", ord: 50, done: false, collapsed: false, due_date: day(2), due_time: "15:00", remind: "15m", repeat: null, notes: "da Rossi", color: null, icon: null, priority: 0 };
await call("/api/sync", { upsert: [mine] }); await new Promise(r => setTimeout(r, 1500));
let ev = (await gadmin("/admin/events")).evs.find(e => e.summary === "Tagliando auto");
ok(ev && ev.start.dateTime && ev.reminders.overrides[0].minutes === 15 && ev.extendedProperties.private.organizeId === "mio1" && ev.description === "da Rossi", "voce creata su Google con ora, avviso 15 min, note");
const expectedStart = new Date(ev.start.dateTime); console.log("   start", ev.start.dateTime, ev.start.timeZone);
const allday = { ...mine, id: "mio2", text: "Pagare bollo", due_time: null, remind: "morning" };
await call("/api/sync", { upsert: [allday] }); await new Promise(r => setTimeout(r, 1500));
ev = (await gadmin("/admin/events")).evs.find(e => e.summary === "Pagare bollo");
ok(ev && ev.start.date === day(2) && ev.end.date === day(3) && ev.transparency === "transparent", "voce senza ora = evento di giornata libero");
// modifica + fatto
await call("/api/sync", { upsert: [{ ...mine, text: "Tagliando auto (Rossi)", done: true }] }); await new Promise(r => setTimeout(r, 1500));
ev = (await gadmin("/admin/events")).evs.find(e => e.extendedProperties?.private?.organizeId === "mio1");
ok(ev.summary === "✓ Tagliando auto (Rossi)", "modifica+fatto aggiornano l'evento: " + ev.summary);
const n0 = (await gadmin("/admin/events")).evs.filter(e => e.status !== "cancelled").length;
await tick(); await tick();
const n1 = (await gadmin("/admin/events")).evs.filter(e => e.status !== "cancelled").length;
ok(n0 === n1, "nessun evento doppio dopo altri giri (" + n1 + ")");
const lg = (await gadmin("/admin/events")).log; const patches = lg.filter(l => l.startsWith("PATCH")).length; await tick(); await tick();
ok((await gadmin("/admin/events")).log.filter(l => l.startsWith("PATCH")).length === patches, "nessuna eco: i giri a vuoto non rimandano nulla");
const back = await byText("Tagliando auto (Rossi)"); ok(back && back.done === 1, "la voce in Organize non viene rovinata dall'eco");

// ---- Google -> Organize (modifiche) ----
const gd = (await gadmin("/admin/events")).evs.find(e => e.summary === "Dentista");
await gadmin("/admin/update/" + gd.id, { summary: "Dentista (Dott. Bianchi)", start: { dateTime: day(1) + "T13:30:00Z" }, end: { dateTime: day(1) + "T14:00:00Z" } });
await tick();
const d2 = await byText("Dentista (Dott. Bianchi)"); ok(d2 && d2.id === dent.id && d2.due_time !== dent.due_time, "titolo e ora cambiati su Google arrivano in Organize: " + (d2 && d2.due_time));
const gm = (await gadmin("/admin/events")).evs.find(e => e.extendedProperties && e.extendedProperties?.private?.organizeId === "mio2");
await gadmin("/admin/update/" + gm.id, { summary: "Pagare bollo auto", start: { date: day(4) }, end: { date: day(5) } });
await tick();
const m2 = (await items()).find(i => i.id === "mio2"); ok(m2 && m2.text === "Pagare bollo auto" && m2.due_date === day(4), "una mia voce spostata su Google si sposta anche qui");
// cancellazione su Google
await gadmin("/admin/delete/" + gd.id, {}); await tick();
ok(!(await items()).find(i => i.id === dent.id), "evento cancellato su Google = voce eliminata in Organize");

// ---- cancellazioni in Organize ----
await call("/api/sync", { delete: ["mio1"] }); await new Promise(r => setTimeout(r, 2500)); await tick();
ev = (await gadmin("/admin/events")).evs.find(e => e.extendedProperties && e.extendedProperties?.private?.organizeId === "mio1");
ok(ev && ev.status === "cancelled", "voce eliminata in Organize = evento eliminato su Google");
await call("/api/sync", { delete: [comp.id] }); await tick();
const comp2 = (await gadmin("/admin/events")).evs.find(e => e.summary === "Compleanno Anna");
ok(comp2 && comp2.status !== "cancelled", "voce di Google eliminata in Organize: l'evento resta su Google");
await call("/api/google/sync", {}); await tick();
ok(!(await items()).find(i => i.text === "Compleanno Anna"), "...e non ricompare dopo una risincronizzazione completa");
// data tolta
await call("/api/sync", { upsert: [{ ...allday, text: "Pagare bollo auto", due_date: null }] }); await new Promise(r => setTimeout(r, 2500));
const gm2 = (await gadmin("/admin/events")).evs.find(e => e.extendedProperties && e.extendedProperties?.private?.organizeId === "mio2");
ok(gm2 && gm2.status === "cancelled", "data tolta in Organize = evento tolto da Google");
// feed ICS non rimanda indietro gli eventi di Google
const ics = await (await fetch(B + new URL(s0.calendarUrl).pathname)).text();
ok(!ics.includes("Dentista") && !ics.includes("Vacanze"), "il feed iCal non contiene gli eventi arrivati da Google");
// token scaduto/403
const s2 = await jget("/api/settings"); console.log("stato:", JSON.stringify(s2.google)); ok(!s2.google.error, "nessun errore registrato");
// scollega
r = await call("/api/google/disconnect", {}); const s3 = await jget("/api/settings"); ok(!s3.google.connected, "scollegato");
console.log(fails ? `\n${fails} PROBLEMI` : "\nTUTTO OK");
