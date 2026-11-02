# Prove in locale della sincronizzazione Google Calendar

Non serve un vero account Google: `mock-google.mjs` finge login e Calendar API.

```
node dev/mock-google.mjs &
npx wrangler dev --port 8787 --test-scheduled \
  --var GOOGLE_API_BASE:http://localhost:8799/calendar/v3 \
  --var GOOGLE_TOKEN_URL:http://localhost:8799/token \
  --var GOOGLE_AUTH_URL:http://localhost:8799/auth
node dev/test-google-sync.mjs        # password locale: prova123
```
Il test usa `POST /cdn-cgi/local/explorer/api/local/scheduled?worker=organize` per far girare il cron.
Prima di rilanciarlo ripulisci il DB locale (voci con gcal_src=1, categoria cat-gcal, impostazioni g_*).
Questa cartella non viene pubblicata (solo `src/` e `public/` vanno online).
