# ORGANIZE

Una piccola app personale per organizzare il lavoro: categorie, voci annidate, scadenze, avvisi sul telefono e calendario.

- **Frontend**: `public/` (HTML/CSS/JS senza framework, installabile come app su iPhone e Mac).
- **Backend**: `src/worker.js` (Cloudflare Worker) con database D1 (`migrations/`).
- **Avvisi**: un cron ogni minuto controlla le scadenze e invia notifiche Web Push (`src/webpush.js`).
- **Calendario**: feed iCal privato in `/cal/<token>.ics` (indirizzo in Impostazioni dell'app).

## Sviluppo

```sh
npm install
npx wrangler d1 migrations apply liste --local
npm run dev
```

## Pubblicazione

Cloudflare Workers Builds pubblica automaticamente ogni push su `main` (`npx wrangler deploy`).
Le migrazioni del database si applicano con `npx wrangler d1 migrations apply liste --remote`.
