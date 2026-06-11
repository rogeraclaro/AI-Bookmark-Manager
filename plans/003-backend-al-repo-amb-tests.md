# Plan 003: Convertir el backend en un paquet del repo amb tests de caracterització

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- vps-server.js vps-server.env.example`
> Si `vps-server.js` ha canviat des que es va escriure aquest pla, compara amb
> els excerpts abans de continuar; si no coincideixen, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (cap canvi de comportament; el desplegament al VPS és pas d'operador)
- **Depends on**: 002 (només si el seu informe va detectar divergència repo↔VPS: llavors cal reconciliar primer — vegeu STOP conditions)
- **Category**: tests / tech-debt
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

`vps-server.js` (272 línies) és l'únic guardià de totes les dades del sistema
i té **zero tests**. A més és un fitxer orfe: viu a l'arrel del repo sense
`package.json` (les seves dependències — express, cors — només existeixen al
VPS), de manera que ni tan sols es pot executar localment, i el fitxer
desplegat (`/home/masellas-ailinksdb/backend/server.js`) s'edita a mà sense
font de veritat. Aquest pla crea `backend/` com a paquet executable i testable,
amb tests de caracterització que congelen el comportament actual. És
**prerequisit** dels plans 004 (robustesa) i 011 (sync), que modifiquen aquest codi.

Regla d'or: **cap canvi de comportament**. Els tests descriuen el que el codi
FA avui, no el que hauria de fer.

## Current state

- `vps-server.js` — servidor Express complet (CommonJS, `require`). Estructura:
  - `:12` `API_SECRET = process.env.API_SECRET`; `:19-27` middleware `checkAuth` global (header `x-api-secret`, 403 si no coincideix).
  - `:30-41` `readDB`/`writeDB` sobre `DB_FILE = path.join(__dirname, 'db.json')`.
  - `:45-81` endpoints de dades: GET/POST `/bookmarks`, `/categories`, `/deleted`, POST `/reset`.
  - `:85-119` `callGroq(messages)` — crida HTTPS a `api.groq.com`, model `llama-3.3-70b-versatile`, `process.env.GROQ_API_KEY`.
  - `:121-135` helpers `isTweetUrl`, `sanitizeText` (⚠️ conté caràcters de control CRUS dins la regex de la línia 131 — copia'ls byte a byte, no els "arreglis"; el plan 004 ho escaparà).
  - `:139-200` POST `/categorize`; `:204-268` POST `/process-tweet`; `:270-272` `app.listen(3002)`.
- `vps-server.env.example` — documenta `API_SECRET` i `GROQ_API_KEY`.
- L'arrel del repo té `"type": "module"` a `package.json` — per això el codi
  CommonJS NO es pot testejar in-place: cal el subdirectori `backend/` amb el
  seu propi `package.json` (sense `"type": "module"`).
- Convencions del repo: subprojectes amb package.json propi i vitest
  (`extension/`, `mobile/`) — `backend/` segueix el mateix patró.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Instal·lar deps backend | `cd backend && npm install` | exit 0 |
| Tests backend (nous) | `cd backend && npm test` | tots passen |
| Arrencada local | `cd backend && API_SECRET=test node server.js` | `Server running on port 3002` |
| Tests existents (regressió) | `npm run test` (root) i `cd extension && npm run test` | 35 i 23 passen |

## Scope

**In scope**:
- `backend/package.json`, `backend/app.js`, `backend/server.js` (crear)
- `backend/tests/api.test.js` (crear)
- `backend/.env.example` (moure-hi el contingut de `vps-server.env.example`)
- `backend/README.md` (crear, breu: com executar, testejar i desplegar)
- Eliminar `vps-server.js` i `vps-server.env.example` de l'arrel
- `.gitignore` (afegir `backend/db.json` i `backend/.env`)
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- Qualsevol fix de comportament (validació, escriptura atòmica, /reset…) — això és el plan 004.
- Els clients (`src/`, `extension/`, `mobile/`).
- El VPS — el desplegament del nou layout és pas d'operador (vegeu Maintenance notes).
- `deploy-to-vps.sh` (només desplega el frontend; el deploy del backend es documenta a `backend/README.md`).

## Git workflow

- Branch: `advisor/003-backend-package`.
- Un commit per step lògic; missatges estil repo (`add backend package with characterization tests`).
- NO push sense instrucció.

## Steps

### Step 1: Crear el paquet backend

Crea `backend/package.json`:

```json
{
  "name": "ai-bookmarks-backend",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

(Sense `"type": "module"`: el codi és CommonJS. Vitest pot importar mòduls CJS.)

**Verify**: `cd backend && npm install` → exit 0.

### Step 2: Separar app i servidor (sense canviar comportament)

Mou el contingut de `vps-server.js` a `backend/app.js` amb DOS únics canvis:

1. Embolcalla-ho en una factoria perquè els tests puguin injectar el fitxer de DB:

```js
// backend/app.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

function createApp({ dbFile } = {}) {
    const app = express();
    const DB_FILE = dbFile || path.join(__dirname, 'db.json');
    // ... TOT el codi actual de vps-server.js, idèntic,
    // excepte `const PORT` i `app.listen` que van a server.js ...
    return app;
}

module.exports = { createApp };
```

2. Crea `backend/server.js`:

```js
const { createApp } = require('./app');
const PORT = 3002;
createApp().listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

⚠️ La regex de `sanitizeText` (línia 131 de l'original) conté bytes de control
crus (`\x00-\x1f`, `\x7f`–U+009F literals). Copia el fitxer amb `git mv` o
`cp` + edició quirúrgica, NO retecleig — un editor pot menjar-se aquests bytes.
Comprova-ho: `sed -n '/sanitizeText/,/substring/p' backend/app.js | hexdump -C | grep -c "00 2d 1f"` → `1`.

Després: `git rm vps-server.js` i `git mv vps-server.env.example backend/.env.example`.

**Verify**: `cd backend && API_SECRET=test node server.js &` → imprimeix `Server running on port 3002`; després `curl -s -o /dev/null -w "%{http_code}" localhost:3002/bookmarks` → `403` (sense header). Mata el procés.

### Step 3: Tests de caracterització

Crea `backend/tests/api.test.js` (vitest + supertest, DB en fitxer temporal per test):

```js
const { describe, it, expect, beforeEach } = require('vitest');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../app');

const SECRET = 'test-secret';
let app, dbFile;

beforeEach(() => {
  process.env.API_SECRET = SECRET;
  delete process.env.GROQ_API_KEY;
  dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aibm-')), 'db.json');
  app = createApp({ dbFile });
});
```

⚠️ Atenció: `API_SECRET` es llegeix a `process.env` **en el moment de crear
l'app** (línia `const API_SECRET = process.env.API_SECRET` dins el mòdul o la
factoria, segons com hagi quedat el Step 2). Assegura't que la lectura queda
DINS de `createApp` perquè el `beforeEach` funcioni; això no canvia el
comportament en producció.

Casos a cobrir (mínim — tots descriuen comportament ACTUAL):

1. **Auth**: request sense header → 403 `{error:'Unauthorized'}`; amb header incorrecte → 403; amb header correcte → 200.
2. **Roundtrip bookmarks**: GET inicial → `{data: []}`; POST `{data:[{id:'1',title:'t'}]}` → `{success:true}`; GET → retorna l'array.
3. **Roundtrip categories i deleted**: anàlegs.
4. **POST /bookmarks substitueix tot l'array** (no fa append): POST amb 2 ítems, després POST amb 1 → GET retorna només 1. (Aquest comportament és el contracte actual; el plan 011 el canviarà conscientment.)
5. **POST /reset** → GET de les tres col·leccions buides.
6. **POST /categorize sense GROQ_API_KEY** → 200 `{categories:[],title:'',description:''}`.
7. **POST /process-tweet sense GROQ_API_KEY** → 200 amb `originalId` igual a `tweet.id`, `isAI:false`, `categories:['Altres']`, title truncat a 77+'...'.
8. **DB inexistent** → GET /bookmarks → `{data:[]}` (readDB retorna defaults).

NO testegis `/categorize` ni `/process-tweet` amb GROQ_API_KEY definida (faria
crides de xarxa reals).

**Verify**: `cd backend && npm test` → tots els tests passen (≥10 asserts).

### Step 4: README del backend i gitignore

Crea `backend/README.md` amb: descripció (1 paràgraf), variables d'entorn
(remet a `.env.example`), com executar (`npm start`), com testejar
(`npm test`), i com desplegar:

```
# Deploy manual al VPS
scp backend/app.js backend/server.js backend/package.json root@62.169.25.188:/home/masellas-ailinksdb/backend/
ssh root@62.169.25.188 'cd /home/masellas-ailinksdb/backend && npm install --omit=dev && pm2 restart ai-bookmarks'
```

Afegeix a `.gitignore`: `backend/db.json` i `backend/.env`.

**Verify**: `git check-ignore backend/db.json backend/.env` → ambdues rutes.

### Step 5: Regressió global

**Verify**:
- `npm run test` (root) → 35 passen (cap importava vps-server.js, però confirma-ho)
- `cd extension && npm run test` → 23 passen
- `git grep -l "vps-server" -- ':!plans' ':!*.md'` → cap fitxer de codi hi fa referència (els .md s'actualitzen al plan 009)

## Test plan

Cobert al Step 3 (tests de caracterització són el lliurable principal).
Patró estructural: no n'hi ha cap al repo per a backend — segueix l'esquelet
donat. Per a l'estil d'asserts, mira `extension/tests/single-save.test.ts`.

## Done criteria

- [ ] `cd backend && npm test` → exit 0, ≥8 casos de l'Step 3 coberts
- [ ] `backend/app.js` exporta `createApp`; `node backend/server.js` arrenca
- [ ] El hexdump de la regex de control chars coincideix (cap byte perdut)
- [ ] `vps-server.js` ja no existeix; `git grep vps-server` net en codi
- [ ] Tests root (35) i extensió (23) segueixen verds
- [ ] `backend/README.md` documenta run/test/deploy
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- L'informe del plan 002 (`plans/002-INFORME.md`, si existeix) documenta que
  el server desplegat al VPS ha DIVERGIT de `vps-server.js` → STOP: cal que
  l'operador decideixi quina versió és canònica abans de congelar-la en tests.
- `vps-server.js` no coincideix amb els excerpts (drift).
- Algun test de caracterització revela comportament que sembla un bug (p. ex.
  crash): NO l'arreglis; documenta'l com a test `.todo` amb comentari i
  continua — els fixes són del plan 004.

## Maintenance notes

- **Desplegament pendent d'operador**: després del merge, cal pujar el nou
  layout al VPS (instruccions a `backend/README.md`) perquè el fitxer del VPS
  torni a tenir font de veritat. Fins llavors, el VPS segueix corrent la còpia
  antiga (comportament idèntic — no hi ha pressa, però sí deute).
- Els plans 004 i 011 editen `backend/app.js`; qualsevol canvi seu ha de
  passar per aquests tests.
- El model Groq hardcodejat (`llama-3.3-70b-versatile`) hauria de ser env var
  algun dia — deixat fora d'abast conscientment (el plan 004 el toca si el 002
  va concloure que és la causa del bug del share).
