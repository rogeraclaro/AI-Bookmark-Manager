# Plan 005: Afegir el header d'autenticació a la importació massiva de tweets del web

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- src/services/claudeService.ts src/services/claudeService.test.ts`
> Si no coincideix amb "Current state", STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (compatible amb 001: el secret es llegeix d'env var, no es hardcodeja)
- **Category**: bug
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

El backend exigeix el header `x-api-secret` a TOTES les rutes
(`vps-server.js:19-27`, middleware global). El fix de 2026-05-22 (commit
`2206363`) va afegir el header a l'extensió Chrome però NO al servei
d'importació massiva del web app: `claudeService.ts` crida
`POST /api/process-tweet` només amb `Content-Type`. Resultat segons el
contracte del repo: cada tweet rep 403, es reintenta 3 vegades amb 2s de
delay, i acaba com a entrada de reserva amb categoria «Altres» — la
funcionalitat d'importar l'arxiu de Twitter queda silenciosament degradada i
lentíssima.

## Current state

- `src/services/claudeService.ts:29-31` — resolució de la URL del proxy:
```ts
const proxyUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLAUDE_PROXY_URL)
    ? import.meta.env.VITE_CLAUDE_PROXY_URL as string
    : 'https://ailinksdb.masellas.info/api'
```
- `src/services/claudeService.ts:58-70` — el fetch sense header d'auth:
```ts
const response = await fetch(`${proxyUrl}/process-tweet`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  ...
```
- Patró correcte al mateix repo (com ho fa storage.ts): `src/services/storage.ts:10-11,30-33`:
```ts
const API_SECRET = import.meta.env.VITE_STORAGE_SECRET;
...
headers: { 'Content-Type': 'application/json', 'x-api-secret': API_SECRET }
```
- Tests existents: `src/services/claudeService.test.ts` (81 línies, mock de
  `fetch` global) — usa'l com a patró i amplia'l.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Tests root | `npm run test` | tots passen (35 + els nous) |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Lint | `npx eslint src/services/claudeService.ts` | cap error NOU (el fitxer té 1 error preexistent `no-control-regex` que arregla el plan 008 — no el toquis) |

## Scope

**In scope**:
- `src/services/claudeService.ts`
- `src/services/claudeService.test.ts`
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- `extension/shared/api.ts` — ja envia el header.
- `vps-server.js` / `backend/` — el server no canvia.
- La lògica de retries/fallback de claudeService — només s'afegeix el header.

## Git workflow

- Branch: `advisor/005-auth-header-process-tweet`. Un sol commit.

## Steps

### Step 1: Afegir el header

A `src/services/claudeService.ts`, sota la resolució de `proxyUrl` (línia ~31),
afegeix:

```ts
const apiSecret = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STORAGE_SECRET)
    ? import.meta.env.VITE_STORAGE_SECRET as string
    : ''
```

i canvia el fetch perquè inclogui el header:

```ts
headers: {
  'Content-Type': 'application/json',
  ...(apiSecret ? { 'x-api-secret': apiSecret } : {}),
},
```

(El condicional preserva el mode localStorage-only sense secret configurat,
on el proxy igualment fallaria de manera controlada pel fallback existent.)

**Verify**: `npx tsc --noEmit -p tsconfig.app.json` → exit 0.

### Step 2: Test de regressió

A `src/services/claudeService.test.ts`, afegeix un test que comprovi que el
fetch a `/process-tweet` inclou el header `x-api-secret` quan
`import.meta.env.VITE_STORAGE_SECRET` està definit. Segueix el patró de mock
de fetch del fitxer. Per estubar l'env en vitest: `vi.stubEnv('VITE_STORAGE_SECRET', 'test-secret')`
(i `vi.unstubAllEnvs()` al cleanup). Assert sobre `fetchMock.mock.calls[0][1].headers`.

**Verify**: `npm run test` → tots passen, incloent el nou.

## Test plan

- Nou test: "envia x-api-secret a /process-tweet quan hi ha secret configurat"
  (assert del header al mock).
- Cobertura existent del fitxer (retries, fallback) ha de seguir verda sense
  modificacions.

## Done criteria

- [ ] `grep -n "x-api-secret" src/services/claudeService.ts` → 1 resultat
- [ ] `npm run test` → exit 0 amb ≥1 test nou
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → exit 0
- [ ] Cap altre fitxer modificat (`git status`)
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- El fetch de `claudeService.ts` ja conté `x-api-secret` (algú ho ha arreglat
  des del commit `84c672a`) → marca el pla com a REJECTED a l'índex i reporta.
- `vi.stubEnv` no funciona amb `import.meta.env` a la versió de vitest del
  repo (4.x — hauria de funcionar): si després d'un intent raonable no pots
  testejar l'env, fes el test injectant el header esperat d'una altra manera
  documentada, o reporta.

## Maintenance notes

- Quan es faci la rotació del secret (plan 001), aquest codi no canvia: llegeix
  `VITE_STORAGE_SECRET` de `.env` en temps de build. Recordar rebuild+redeploy
  del web després de rotar.
- Si el plan 011 (sync) introdueix un client API unificat, aquest fetch hauria
  de migrar-hi (deduplicaria la lògica del header amb storage.ts).
