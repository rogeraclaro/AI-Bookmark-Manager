# Plan 007: Fer que esborrar l'últim bookmark es persisteixi (i eliminar el re-desat de cada càrrega)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- src/App.tsx`
> Si les línies citades a "Current state" no coincideixen, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED — toca el mecanisme de persistència del web app; llegeix "Per què la guarda existeix" abans de tocar res
- **Depends on**: none (sinèrgia amb 011, que substituirà aquest mecanisme; fer aquest igualment — 011 és L i pot trigar)
- **Category**: bug
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

Al web app, esborrar l'últim bookmark no es desa mai: la guarda
`if (bookmarks.length > 0)` de l'efecte de persistència no envia l'array buit
al servidor, i en recarregar la pàgina el bookmark «torna». El mateix passa si
l'usuari esborra tots els bookmarks d'un en un. A més, l'efecte es dispara
durant la càrrega inicial (quan `setBookmarks` del load posa dades), de manera
que **cada visita a la pàgina re-POSTa tot l'array** al servidor — escriptura
innecessària que amplia la finestra de race multi-dispositiu (vegeu plan 011).

**Per què la guarda existeix (no l'eliminis sense substituir-la):** protegeix
contra el cas que la càrrega falli o encara no hagi acabat i l'efecte
persisteixi l'estat inicial `[]`, esborrant tot el servidor. La solució és
substituir la guarda per un flag explícit de «dades carregades amb èxit».

## Current state

- `src/App.tsx:337-380` — efecte de càrrega (`loadData` dins `useEffect`),
  amb `try { ... } catch { ... } finally { setIsDataLoading(false) }`.
- `src/App.tsx:382-393` — els tres efectes de persistència:
```tsx
// Save Data when changed
useEffect(() => {
    if (bookmarks.length > 0) storage.saveBookmarks(bookmarks)
}, [bookmarks])

useEffect(() => {
    if (categories.length > 0) storage.saveCategories(categories)
}, [categories])

useEffect(() => {
    storage.saveDeletedIds(deletedIds)
}, [deletedIds])
```
  ⚠️ Fixa't que el tercer (deletedIds) NO té cap guarda: avui ja envia `[]` al
  servidor a cada càrrega de pàgina.
- `src/App.tsx:275` — el component ja usa refs (`abortControllerRef`); mateix patró.
- Esborrat d'un bookmark: `confirmDelete` a `src/App.tsx:702-709` (fa
  `setBookmarks(prev => prev.filter(...))` — l'efecte fa la resta).

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Tests root | `npm run test` | 35 passen |
| Build | `npm run build` | exit 0 |
| Dev server (verificació manual) | `npm run dev` | servidor a localhost |

## Scope

**In scope**:
- `src/App.tsx` (NOMÉS l'efecte de càrrega i els tres efectes de persistència)
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- `src/services/storage.ts`.
- La migració `category → categories` dins `loadData` (línies 346-364) — es
  conserva tal qual, incloent el seu `storage.saveBookmarks(migratedBookmarks)`
  explícit.
- Qualsevol altra part d'`App.tsx` (és un fitxer de 2.146 línies: precisió
  quirúrgica).

## Git workflow

- Branch: `advisor/007-persist-empty-delete`. Un commit.

## Steps

### Step 1: Afegir el flag de càrrega completada

A `src/App.tsx`, al costat dels altres refs (prop de la línia 275):

```tsx
// True només quan la càrrega inicial ha acabat BÉ. Els efectes de
// persistència no s'executen abans: evita (a) re-desar el que acabem de
// carregar i (b) sobreescriure el servidor amb estat buit si la càrrega falla.
const hasLoadedRef = useRef(false)
```

Dins `loadData`, com a ÚLTIMA línia del bloc `try` (després de
`setDeletedIds(loadedDeletedIds)` i la lògica de migració/search):

```tsx
hasLoadedRef.current = true
```

⚠️ Al `catch` NO es posa a true: si la càrrega ha fallat, no volem persistir res.

**Verify**: `npx tsc --noEmit -p tsconfig.app.json` → exit 0.

### Step 2: Substituir les guardes dels efectes

Substitueix els tres efectes de persistència per:

```tsx
// Save Data when changed (només després d'una càrrega inicial correcta)
useEffect(() => {
    if (!hasLoadedRef.current) return
    storage.saveBookmarks(bookmarks)
}, [bookmarks])

useEffect(() => {
    if (!hasLoadedRef.current) return
    if (categories.length > 0) storage.saveCategories(categories)
}, [categories])

useEffect(() => {
    if (!hasLoadedRef.current) return
    storage.saveDeletedIds(deletedIds)
}, [deletedIds])
```

Notes de disseny (respecta-les):
- Bookmarks: la guarda `length > 0` desapareix — ara un array buit després
  d'esborrar l'últim SÍ es persisteix (és el fix).
- Categories: es manté `length > 0` a més del flag — el servidor amb llista
  buida fa que `storage.getCategories` retorni els defaults
  (`src/services/storage.ts:75`), i no hi ha cap fluxe legítim que buidi
  totes les categories de cop.
- React StrictMode (dev) munta dues vegades: el ref sobreviu el doble mount i
  el comportament és correcte en ambdós casos.

**Verify**: `npx tsc --noEmit -p tsconfig.app.json` → exit 0; `npm run test` → 35 passen.

### Step 3: Verificació manual del fix (mode localStorage)

El mode localStorage usa el mateix codi d'efectes, així que serveix per
verificar sense tocar el servidor:

1. Assegura't que `.env` NO es carrega (exporta `VITE_STORAGE_SECRET=""` o
   executa amb un `.env.local` buit — o simplement comprova el comportament
   amb la xarxa: pas següent).
2. `npm run dev`, obre l'app, fes login (si no tens credencials de login,
   pots verificar amb el flux de DevTools del pas 3).
3. Alternativa amb API: obre DevTools → Network. Carrega la pàgina i comprova
   que NO hi ha cap `POST /bookmarks` durant la càrrega (abans n'hi havia un
   per render inicial — el fix l'elimina). Després esborra un bookmark i
   comprova que SÍ es fa el POST.

Si no pots fer verificació manual (entorn sense navegador), documenta-ho a
l'informe final i deixa la checklist per a l'operador.

**Verify**: descrit a dalt; com a mínim, els greps del Done criteria.

## Test plan

El repo no té infraestructura de tests de components React (no hi ha jsdom ni
testing-library a l'arrel). NO n'afegeixis per aquest fix (seria
sobre-enginyeria per a un canvi de 10 línies — i és exactament el tipus de
cobertura que el plan 011 introduirà en refactoritzar la persistència).
La verificació és: typecheck + tests existents + greps estructurals +
checklist manual del Step 3.

## Done criteria

- [ ] `grep -n "hasLoadedRef" src/App.tsx` → ≥4 resultats (declaració, set, 3 guardes)
- [ ] `grep -n "if (bookmarks.length > 0) storage.saveBookmarks" src/App.tsx` → 0 resultats
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → exit 0
- [ ] `npm run test` → exit 0
- [ ] `npm run build` → exit 0
- [ ] Diff limitat als efectes descrits (`git diff --stat` → només src/App.tsx i plans/README.md)
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- Els efectes de persistència no coincideixen amb l'excerpt (drift).
- Detectes ALTRES llocs d'App.tsx que criden `storage.saveBookmarks`
  directament i que es dispararien abans de la càrrega (no n'hi ha al commit
  `84c672a` fora de loadData/processTweetsData/handleFinalAccept/backup-import,
  tots posteriors a la càrrega) → si en trobes de nous, reporta.
- La verificació manual mostra que el POST inicial segueix passant →
  reverteix i reporta (algun setState durant la càrrega s'executa després de
  posar el flag — l'ordre del Step 1 és important).

## Maintenance notes

- El plan 011 substituirà aquests efectes per operacions granulars; aquest
  flag és la semàntica que cal conservar allà («no persistir fins que la
  càrrega inicial hagi anat bé»).
- Revisor: l'única cosa delicada és ON es posa `hasLoadedRef.current = true`
  (final del try, no del finally). Al finally trencaria la protecció en cas
  d'error de càrrega.
