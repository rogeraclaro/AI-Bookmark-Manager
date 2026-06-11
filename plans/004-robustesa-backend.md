# Plan 004: Fer el backend robust — escriptura atòmica, validació, backups i eliminar /reset

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- backend/ src/services/storage.ts`
> Aquest pla pressuposa que el plan 003 ja ha creat `backend/app.js` amb
> `createApp` i els tests de caracterització. Si `backend/` no existeix, STOP.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW (canvis coberts per tests; el desplegament al VPS és pas d'operador)
- **Depends on**: plans/003-backend-al-repo-amb-tests.md
- **Category**: bug / security
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

Tota la base de dades del sistema és UN fitxer `db.json` i el codi actual pot
corrompre'l o quedar inutilitzable per sempre amb un sol incident:

1. `writeDB` usa `fs.writeFileSync` directe — un crash a mig write deixa el
   JSON truncat.
2. `readDB` fa `JSON.parse` sense try — amb el JSON truncat, **cada request
   posterior peta** i no hi ha cap backup per recuperar.
3. `/process-tweet` desreferencia `tweet.text` sense validar que `tweet`
   existeixi — un body malformat penja la request (Express 4 no captura
   excepcions síncrones dins handlers async).
4. `POST /reset` esborra tota la BD amb una sola request, i el secret que la
   protegeix és extreïble del bundle públic del web (vegeu plan 001) — risc
   desproporcionat per a un endpoint que el client pot substituir amb POSTs buits.

## Current state

(Línies referides a `vps-server.js` del commit `84c672a`; després del plan 003
el mateix codi viu dins `createApp` a `backend/app.js` — localitza-lo per
contingut, no per número de línia.)

- `readDB` (orig. `:30-35`):
```js
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        return { bookmarks: [], categories: [], deletedIds: [] };
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};
```
- `writeDB` (orig. `:37-41`): `fs.writeFileSync(DB_FILE, JSON.stringify(newData, null, 2))`.
- `/reset` (orig. `:78-81`): `fs.writeFileSync(DB_FILE, JSON.stringify({...buit}))`.
- `/process-tweet` (orig. `:204-206`): `const { tweet, categories } = req.body; const sanitized = sanitizeText(tweet.text || '');` — peta si `tweet` és undefined.
- `sanitizeText` (orig. `:125-135`): conté una character class amb bytes de
  control CRUS al fitxer font (rang NUL–US i DEL–U+009F sense escapar).
- Client del `/reset`: `src/services/storage.ts:106-118` (`clearData`) fa
  `apiRequest('reset', 'POST', {})`.
- Tests existents: `backend/tests/api.test.js` (del plan 003) — inclou un test
  de `/reset` que caldrà adaptar.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Tests backend | `cd backend && npm test` | tots passen |
| Typecheck web | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Tests root | `npm run test` | 35 passen |

## Scope

**In scope**:
- `backend/app.js`
- `backend/tests/api.test.js`
- `src/services/storage.ts` (només el mètode `clearData`)
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- El model de sync POST-tot-l'array — és el plan 011.
- Els prompts de Groq i el model — fora d'abast (excepte si l'informe del plan
  002 va demanar canviar el model: en aquest cas és UN canvi d'string permès,
  documenta'l).
- `extension/`, `mobile/` — no criden `/reset`.
- El desplegament al VPS.

## Git workflow

- Branch: `advisor/004-backend-hardening`. Un commit per step.

## Steps

### Step 1: Escriptura atòmica amb còpia de seguretat

Substitueix `writeDB` per escriptura temp-file + rename (atòmica al mateix
filesystem) mantenint el merge actual, i conserva l'última versió bona:

```js
const writeDB = (data) => {
    const current = readDB();
    const newData = { ...current, ...data };
    const json = JSON.stringify(newData, null, 2);
    const tmpFile = DB_FILE + '.tmp';
    fs.writeFileSync(tmpFile, json);
    if (fs.existsSync(DB_FILE)) {
        fs.copyFileSync(DB_FILE, DB_FILE + '.bak');
    }
    fs.renameSync(tmpFile, DB_FILE);
};
```

Tests nous: (a) després de 2 writes, `db.json.bak` conté l'estat del write
anterior; (b) el roundtrip normal segueix funcionant (ja cobert).

**Verify**: `cd backend && npm test` → verd.

### Step 2: Lectura defensiva

Substitueix `readDB` perquè un JSON corrupte no tombi el servidor:

```js
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        return { bookmarks: [], categories: [], deletedIds: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (err) {
        // Preserva l'evidència i NO sobreescriguis: el .bak i el .corrupt
        // permeten recuperació manual.
        const corruptCopy = DB_FILE + '.corrupt-' + Date.now();
        fs.copyFileSync(DB_FILE, corruptCopy);
        console.error('[readDB] db.json corrupte, copiat a', corruptCopy, err.message);
        throw new DbCorruptError();
    }
};
```

Defineix `class DbCorruptError extends Error {}` i fes que els handlers de
dades responguin 500 `{error: 'DB corrupted, manual recovery required'}` en
comptes de petar el procés. La manera més senzilla sense tocar cada handler:
embolcalla els 6 handlers de dades amb un helper:

```js
const safe = (handler) => (req, res) => {
    try { handler(req, res); }
    catch (err) {
        console.error('[api]', req.path, err.message);
        res.status(500).json({ error: 'Internal error' });
    }
};
// app.get('/bookmarks', safe((req, res) => { ... }))
```

⚠️ NO embolcallis `/categorize` ni `/process-tweet` amb `safe` (són async i ja
tenen try/catch propi); el Step 3 els valida l'entrada.

Test nou: escriu brossa (`{trunc`) a `dbFile`, fes GET /bookmarks → 500 amb
`{error: ...}`, i existeix un fitxer `*.corrupt-*` al directori.

**Verify**: `cd backend && npm test` → verd.

### Step 3: Validar l'entrada dels endpoints d'IA

Al principi del handler de `/process-tweet`:

```js
if (!req.body || typeof req.body !== 'object' || !req.body.tweet || typeof req.body.tweet !== 'object') {
    return res.status(400).json({ error: 'Missing tweet object' });
}
```

I a `/categorize`, abans d'usar `url`:

```js
if (!req.body || typeof req.body.url !== 'string' || !req.body.url) {
    return res.status(400).json({ error: 'Missing url' });
}
```

Tests nous: POST `/process-tweet` amb body `{}` → 400; POST `/categorize` amb
body `{}` → 400. Confirma que els tests de caracterització del fallback
(sense GROQ_API_KEY) segueixen passant (envien `tweet` i `url` vàlids).

**Verify**: `cd backend && npm test` → verd.

### Step 4: Eliminar l'endpoint /reset i adaptar el client web

1. A `backend/app.js`: elimina el handler `app.post('/reset', ...)` sencer.
2. A `backend/tests/api.test.js`: substitueix el test de `/reset` per un que
   verifica que ara retorna 404.
3. A `src/services/storage.ts`, dins `clearData`, substitueix
   `await apiRequest('reset', 'POST', {})` per:

```ts
await apiRequest('bookmarks', 'POST', { data: [] });
await apiRequest('categories', 'POST', { data: [] });
await apiRequest('deleted', 'POST', { data: [] });
```

(El comportament observable per l'usuari és idèntic: tot buit. La diferència
és que ja no existeix un endpoint d'un sol tret per esborrar-ho tot, i el
`.bak` del Step 1 conserva l'estat anterior.)

**Verify**: `cd backend && npm test` → verd; `npx tsc --noEmit -p tsconfig.app.json` → exit 0; `grep -n "reset" src/services/storage.ts` → cap crida a l'endpoint.

### Step 5: Escapar la regex de caràcters de control

A `sanitizeText` dins `backend/app.js`, substitueix la character class que
conté bytes crus (rang NUL–US i DEL–U+009F sense escapar) per la forma
escapada equivalent, idèntica a la del client `src/services/claudeService.ts:16`:

```js
.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
```

Test nou: POST `/process-tweet` (sense GROQ_API_KEY) amb
`tweet.text = 'hola' + String.fromCharCode(1) + ' mon' + String.fromCharCode(127) + '!'`
→ el `title` retornat no conté els caràcters de control (charCode 1 i 127).

**Verify**: `cd backend && npm test` → verd; `LC_ALL=C grep -c $'[\x00-\x08]' backend/app.js` → `0` (cap byte de control cru al fitxer font).

## Test plan

Tests nous (tots a `backend/tests/api.test.js`, patró del plan 003):
backup `.bak` (Step 1), DB corrupta → 500 + còpia `.corrupt` (Step 2),
400 per bodies malformats (Step 3), `/reset` → 404 (Step 4), strip de
caràcters de control (Step 5). Total: ≥6 tests nous sobre els ≥10 existents.

## Done criteria

- [ ] `cd backend && npm test` → exit 0 amb els tests nous inclosos
- [ ] `grep -n "writeFileSync(DB_FILE" backend/app.js` → 0 resultats (tot passa per writeDB atòmic)
- [ ] `grep -n "app.post('/reset'" backend/app.js` → 0 resultats
- [ ] `hexdump -C backend/app.js | grep -c " 00 "` → 0
- [ ] `npx tsc --noEmit -p tsconfig.app.json` i `npm run test` (root) → verds
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- `backend/` no existeix o no té els tests del plan 003.
- Un test de caracterització del plan 003 falla DESPRÉS d'un canvi i no és un
  dels canvis intencionats llistats aquí (reset→404 és l'únic contracte que
  canvia) → reverteix l'step i reporta.
- `src/services/storage.ts` té més usos de `'reset'` dels descrits.

## Maintenance notes

- **Desplegament pendent d'operador** al VPS (instruccions a `backend/README.md`).
  Fins que no es desplegui, el `/reset` antic segueix viu en producció —
  recordar-ho a l'informe final.
- El `.bak` és una xarxa de seguretat d'1 generació; si el volum de dades creix,
  considerar backups rotatius datats o un cron al VPS.
- El plan 011 (sync) tornarà a tocar aquests endpoints; aquests tests són la
  seva xarxa.
