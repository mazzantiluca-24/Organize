const B = "http://localhost:8787", D = "http://localhost:8798"; let cookie = "";
const call = async (p, b) => { const r = await fetch(B + p, { method: b === undefined ? "GET" : "POST", headers: { cookie, "content-type": "application/json" }, body: b === undefined ? undefined : JSON.stringify(b) }); const sc = r.headers.get("set-cookie"); if (sc) cookie = sc.split(";")[0]; return r; };
const jget = async p => (await call(p)).json();
const admin = (p, b) => fetch(D + "/admin/" + p, { method: "POST", body: JSON.stringify(b || {}) }).then(r => r.json());
const dump = async () => (await fetch(D + "/admin/dump", { method: "POST" })).json();
const tick = async () => { await fetch(B + "/cdn-cgi/local/explorer/api/local/scheduled?worker=organize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cron: "* * * * *" }) }); await new Promise(r => setTimeout(r, 800)); };
const items = async () => (await jget("/api/items")).items, byText = async t => (await items()).find(i => i.text === t);
let fails = 0; const ok = (c, m) => { console.log((c ? "OK   " : "FAIL ") + m); if (!c) fails++; };
const day = n => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }, c8 = s => s.replace(/-/g, "");
const ev = (uid, sum, lines) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:20261101T000000Z\r\nSUMMARY:${sum}\r\n${lines}\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
await call("/api/login", { password: "prova123" });
let r = await call("/api/caldav/connect", { appleId: "a@b.it", password: "sbagliata-sbagliata" }); ok(r.status === 400, "password sbagliata rifiutata");
const H = "/123/calendars/home/";
await admin("put", { cal: H, href: H + "e1.ics", ics: ev("e1", "Dentista\\, Dott. Rossi", `DTSTART:${c8(day(1))}T100000Z\r\nDTEND:${c8(day(1))}T110000Z\r\nDESCRIPTION:portare tessera`) });
await admin("put", { cal: H, href: H + "e2.ics", ics: ev("e2", "Compleanno Anna", `DTSTART;VALUE=DATE:${c8(day(3))}\r\nDTEND;VALUE=DATE:${c8(day(4))}`) });
await admin("put", { cal: H, href: H + "e3.ics", ics: ev("e3", "Riunione passata", `DTSTART:${c8(day(-2))}T090000Z\r\nDTEND:${c8(day(-2))}T100000Z`) });
await admin("put", { cal: H, href: H + "e4.ics", ics: ev("e4", "Palestra (ripetuta)", `DTSTART:${c8(day(2))}T170000Z\r\nDTEND:${c8(day(2))}T180000Z\r\nRECURRENCE-ID:${c8(day(2))}T170000Z`) });
await admin("put", { cal: H, href: H + "e5.ics", ics: ev("e5", "Cena Roma", `DTSTART;TZID=Europe/Rome:${c8(day(2))}T200000\r\nDTEND;TZID=Europe/Rome:${c8(day(2))}T220000`) });
r = await call("/api/caldav/connect", { appleId: "a@b.it", password: "abcd abcd abcd abcd" }); ok(r.status === 200, "collegato");
await new Promise(r => setTimeout(r, 2500));
const s = await jget("/api/settings"); ok(s.caldav.connected && s.caldav.user === "a@b.it", "stato collegato");
const dump0 = await dump(); ok(Object.values(dump0).some(c => c.name === "Organize"), "calendario Organize creato su iCloud");
const dent = await byText("Dentista, Dott. Rossi"); ok(dent && dent.due_time === "10:00" && dent.notes === "portare tessera" && !dent.done, "evento con ora importato (testo ripulito)");
ok((await byText("Compleanno Anna")).due_date === day(3), "evento di giornata importato");
ok((await byText("Riunione passata")).done === 1, "evento passato = fatto");
const cena = await byText("Cena Roma"); ok(cena && cena.due_time === "20:00" - 0 || cena.due_time === "19:00" || cena.due_time === "20:00", "evento con fuso orario convertito: " + cena.due_time);
const pal = await byText("Palestra (ripetuta)"); ok(pal && pal.parent === "cat-gcal", "istanza di evento ripetuto importata");
// Organize -> iCloud
await call("/api/sync", { upsert: [{ id: "mio1", parent: "cat-auto", text: "Tagliando auto", ord: 50, done: false, collapsed: false, due_date: day(2), due_time: "15:00", remind: "15m", repeat: null, notes: "da Rossi", color: null, icon: null, priority: 0 }] });
await new Promise(r => setTimeout(r, 2000));
let d = await dump(); const org = Object.entries(d).find(([, c]) => c.name === "Organize")[1];
const mine = Object.values(org.res).find(x => x.ics.includes("UID:mio1@organize"));
ok(mine && /DTSTART:\d{8}T\d{6}Z/.test(mine.ics) && mine.ics.includes("SUMMARY:Tagliando auto") && mine.ics.includes("VALARM") && mine.ics.includes("DESCRIPTION:da Rossi"), "voce creata su iCloud con ora, note e avviso");
await call("/api/sync", { upsert: [{ id: "mio1", parent: "cat-auto", text: "Tagliando Rossi", ord: 50, done: true, collapsed: false, due_date: day(2), due_time: "16:00", remind: "15m", repeat: null, notes: "da Rossi", color: null, icon: null, priority: 0 }] });
await new Promise(r => setTimeout(r, 2000));
d = await dump(); const mine2 = Object.values(Object.entries(d).find(([, c]) => c.name === "Organize")[1].res).find(x => x.ics.includes("UID:mio1@organize"));
ok(mine2.ics.includes("SUMMARY:✓ Tagliando Rossi") && !mine2.ics.includes("Tagliando auto") && (mine2.ics.match(/BEGIN:VEVENT/g) || []).length === 1, "modifica+fatto aggiorna l'evento esistente");
// modifica dell'evento importato (patch conserva il resto)
await admin("put", { cal: H, href: H + "e1.ics", ics: ev("e1", "Dentista", `LOCATION:Via Roma\r\nDTSTART:${c8(day(1))}T100000Z\r\nDTEND:${c8(day(1))}T110000Z`) });
await call("/api/sync", { upsert: [{ ...dent, text: "Dentista oggi", done: !!dent.done }] }); await new Promise(r => setTimeout(r, 2000));
d = await dump(); const e1 = d[H].res[H + "e1.ics"]; ok(e1.ics.includes("SUMMARY:Dentista oggi") && e1.ics.includes("LOCATION:Via Roma"), "evento importato modificato qui: luogo conservato");
// echo / niente doppioni
const n0 = Object.values(await dump()).reduce((a, c) => a + Object.keys(c.res).length, 0); await tick(); await tick(); await tick();
ok(n0 === Object.values(await dump()).reduce((a, c) => a + Object.keys(c.res).length, 0), "nessun doppione dopo altri giri");
// modifica su iCloud
await admin("put", { cal: H, href: H + "e2.ics", ics: ev("e2", "Compleanno Anna!", `DTSTART;VALUE=DATE:${c8(day(4))}\r\nDTEND;VALUE=DATE:${c8(day(5))}`) }); await tick();
const comp = await byText("Compleanno Anna!"); ok(comp && comp.due_date === day(4), "modifica su iCloud arriva in Organize");
// cancellazioni
await admin("del", { cal: H, href: H + "e2.ics" }); await tick(); ok(!(await byText("Compleanno Anna!")), "evento cancellato su iCloud = voce eliminata");
await call("/api/sync", { delete: ["mio1"] }); await new Promise(r => setTimeout(r, 2000)); await tick();
d = await dump(); ok(!Object.values(Object.entries(d).find(([, c]) => c.name === "Organize")[1].res).some(x => x.ics.includes("mio1@organize")), "voce eliminata in Organize = evento eliminato su iCloud");
await call("/api/sync", { delete: [pal.id] }); await tick(); await call("/api/caldav/sync", {}); await tick();
ok(!(await byText("Palestra (ripetuta)")) && !!(await dump())[H].res[H + "e4.ics"], "voce importata eliminata qui: resta su iCloud e non ricompare");
r = await call("/api/caldav/disconnect", {}); ok(!(await jget("/api/settings")).caldav.connected, "scollegato");
console.log(fails ? `\n${fails} PROBLEMI` : "\nTUTTO OK");
