# Plan 011: Substituir el sync «POST de tot l'array» per operacions granulars (eliminar la pèrdua de dades multi-dispositiu)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`. Aquest és el pla més gran del conjunt: fes commit per
> step i no avancis amb verificacions vermelles.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- backend/ src/App.tsx src/services/ extension/shared/api.ts extension/background/service-worker.ts mobile/src/`
> Aquest pla REQUEREIX que 003, 004 i 007 estiguin DONE (mira l'índex). El 010
> Part A també ajuda (menys codi mort a App.tsx). Si no ho estan, STOP.

## Status

- **Priority**: P2
- **Effort**: L (multi-dia)
- **Risk**: MED–HIGH — toca el contracte de dades de tots els clients; mitigat pels tests del backend i el desplegament en dues fases
- **Depends on**: plans/003, plans/004, plans/007 (DONE); recomanat plans/010 Part A
- **Category**: tech-debt / arquitectura
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

Tots els clients persisteixen enviant **l'array complet** de bookmarks
(`POST /bookmarks` substitueix el fitxer sencer). Conseqüència real:

1. El web app carrega la llista al muntar i la reenvia sencera a cada canvi.
   Si mentre tens el web obert deses un bookmark des de l'extensió o el mòbil,
   el següent canvi al web (editar, destacar, esborrar) **esborra
   silenciosament** el bookmark nou: last-write-wins sobre una còpia antiga.
2. L'extensió fa GET→append→POST (`extension/shared/api.ts:59-73`): dues
   extensions o un share simultani poden perdre's mútuament.

El fix: el servidor passa a oferir operacions granulars (afegir, actualitzar,
esborrar UN element) i els clients deixen d'enviar l'array sencer. Per a un
sistema single-user multi-dispositiu això elimina la classe sencera de bug
sense necessitat de CRDTs ni versionat.

## Current state

Backend (després de 003/004, dins `backend/app.js`):
- `POST /bookmarks` substitueix tot l'array (test de caracterització nº4 del plan 003 ho congela — aquest pla EL CANVIA conscientment de contracte... no: MANTÉ l'endpoint legacy i n'afegeix de nous; vegeu Steps).
- `writeDB(data)` fa merge per col·lecció i escriu atòmicament (plan 004).

Clients — inventari COMPLET de llocs d'escriptura (verifica'l amb grep abans de començar):

| Client | Lloc | Operació real |
|---|---|---|
| web | `src/App.tsx` efecte `[bookmarks]` (després del plan 007, guardat amb `hasLoadedRef`) | save-all reactiu — A ELIMINAR |
| web | `src/App.tsx` efectes `[categories]`, `[deletedIds]` | save-all reactiu — categories es pot mantenir (llista petita, reordenable per drag&drop — l'array sencer ÉS l'operació natural); deletedIds → operació append |
| web | `confirmDelete` (~:702) | esborrar 1 bookmark + append 1 deletedId |
| web | `saveBookmark` (~:732) | crear 1 o actualitzar 1 |
| web | `handleToggleHighlight` (~:1066) | actualitzar 1 |
| web | `processTweetsData` (~:582) i `handleFinalAccept` (~:871) | afegir N (batch) |
| web | import de backup (~:655) | afegir N (batch) + merge categories/deletedIds |
| web | `handleCategoryDelete` (~:973) | remap de categories de N bookmarks (batch update) |
| web | `handleResetData`/`clearBookmarks`, `clearData` (storage.ts) | buidar col·leccions (es manté com a POST-all amb `[]`) |
| extensió | `saveBookmark` a `extension/shared/api.ts:59-73` | afegir 1 (avui GET+POST-all) |
| extensió | `saveCategories` (`:49-56`) via ADD_CATEGORY | afegir 1 categoria (avui POST-all) |
| mòbil | `saveBookmark` (re-export de l'extensió) i `addCategoryRemote` (plan 006) | afegir 1 |

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Tests backend | `cd backend && npm test` | tots passen |
| Tests root / ext / mobile | `npm run test` / `cd extension && npm run test` / `cd mobile && npm run test` | tots passen |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Builds | els 3 builds | exit 0 |

## Scope

**In scope**: `backend/app.js`, `backend/tests/`, `src/services/storage.ts`,
`src/services/claudeService.ts` (només si cal pel client API),
`src/App.tsx` (els llocs de la taula), `extension/shared/api.ts`,
`extension/background/service-worker.ts`, `mobile/src/api.ts`,
`backend/README.md` i README (llista d'endpoints), `plans/README.md`.

**Out of scope** (NO fer):
- Refactoritzar App.tsx en components (temptació enorme; resisteix-la).
- Sync en temps real / websockets / refetch periòdic — una altra iteració.
- Autenticació per usuari, CRDTs, versionat optimista amb ETags — el model
  single-user no ho necessita per matar aquest bug.
- Canviar el format de `db.json`.

## Git workflow

- Branch: `advisor/011-granular-sync`. Commit per step. NO push sense instrucció.

## Steps

### Step 1: Endpoints granulars al backend (additius — cap client canvia encara)

Afegeix a `backend/app.js` (tots sota el mateix `checkAuth`):

- `POST /bookmarks/add` — body `{data: Bookmark[]}` (1..N). Append amb dedupe:
  descarta els que ja existeixin per `id` O per `originalLink`. Resposta
  `{success: true, added: n, skipped: m}`.
- `POST /bookmarks/update` — body `{data: Bookmark}`. Substitueix l'element
  amb el mateix `id`; 404 si no existeix.
- `POST /bookmarks/remove` — body `{id: string, deletedId?: string}`. Elimina
  el bookmark i, si ve `deletedId`, l'afegeix a `deletedIds` (dedupe) — una
  sola escriptura atòmica per a l'operació composta d'esborrar.
- `POST /categories/add` — body `{data: string}`. Append amb dedupe.
- `POST /deleted/add` — body `{data: string[]}`. Append amb dedupe.

Els endpoints legacy (`POST /bookmarks` etc.) NO es toquen: serveixen per a
reorder de categories, buidatges i com a fallback durant la transició.

Tests nous a `backend/tests/`: per cada endpoint, cas feliç + dedupe + 400 de
validació (body malformat) + 404 de l'update. Concurrència bàsica: dos `add`
seguits no es trepitgen (són appends server-side — el test és de semàntica,
no de races reals).

**Verify**: `cd backend && npm test` → verd (tests vells + ≥12 nous).

### Step 2: Client API compartit dels nous endpoints

A `extension/shared/api.ts`, afegeix `addBookmarks(bookmarks: Bookmark[])`,
`updateBookmark(b)`, `removeBookmark(id, deletedId?)`, `addCategory(name)`
sobre `apiRequest` existent. Reescriu `saveBookmark` perquè faci
`addBookmarks([bookmark])` (desapareix el GET+POST-all). Adapta el service
worker si li cal (el missatge `SAVE_BOOKMARK` no canvia de contracte).
`ADD_CATEGORY` passa a usar `addCategory` (desapareix el seu GET+POST-all).
`mobile/src/api.ts`: `addCategoryRemote` (del plan 006) passa a delegar a
`addCategory`.

**Verify**: `cd extension && npm run test` → 23 passen (adapta els mocks dels
tests al nou fetch — els tests de single-save mocken `saveBookmark`
indirectament; revisa `extension/tests/single-save.test.ts`);
`cd mobile && npm run test` → verd.

### Step 3: El web deixa de fer save-all reactiu

A `src/services/storage.ts`, afegeix els mètodes granulars equivalents
(mateixos endpoints; en mode localStorage emulen l'operació sobre l'array
local — mantén la paritat de comportament dels dos modes).

A `src/App.tsx`:
1. ELIMINA l'efecte `[bookmarks]` de persistència (el del plan 007).
2. Converteix cada lloc de la taula de "Current state" en una crida explícita:
   - `confirmDelete` → `storage.removeBookmark(id, originalId)`
   - `saveBookmark` → `storage.updateBookmark(...)` o `storage.addBookmarks([...])` segons `newBookmarkMode`
   - `handleToggleHighlight` → `storage.updateBookmark(toggled)`
   - `processTweetsData` / `handleFinalAccept` / import de backup → `storage.addBookmarks(batch)`
   - `handleCategoryDelete` → batch d'`updateBookmark` (o un `POST /bookmarks` legacy amb l'array remapat — ÉS acceptable aquí perquè acabes de llegir... NO: usa updates individuals; el remap pot tocar molts bookmarks, així que afegeix si cal `POST /bookmarks/update-batch` al backend amb el mateix patró que add)
3. L'efecte `[categories]` ES MANTÉ (POST-all legacy: el reorder per drag&drop
   necessita l'array sencer i és una llista petita d'un sol camp).
4. L'efecte `[deletedIds]` s'elimina; els appends van amb `removeBookmark` i
   amb `storage.addDeletedIds` als llocs d'import.

Després de cada operació remota fallida: mostra error a l'usuari (el patró
existent és `setResultModal`) — NO silenciïs el catch.

**Verify**: `npx tsc --noEmit -p tsconfig.app.json` → exit 0;
`npm run test` → verd; `npm run build` → exit 0;
`grep -n "storage.saveBookmarks" src/App.tsx` → 0 resultats (només queden les
crides granulars i el saveCategories del reorder).

### Step 4: Verificació end-to-end local

Arrenca el backend local (`cd backend && API_SECRET=test npm start`) amb un
`db.json` de prova, apunta el web (`.env.local` amb la URL local i el secret
de prova) i executa el guió manual:

1. Crea un bookmark al web → apareix a `backend/db.json`.
2. Simula un altre dispositiu: `curl POST /bookmarks/add` amb un bookmark nou.
3. Al web (SENSE recarregar), edita o destaca el bookmark del pas 1.
4. **Comprovació clau**: el bookmark del pas 2 SEGUEIX a `db.json` (abans del
   pla, hauria desaparegut).
5. Esborra l'últim bookmark → `db.json` queda amb l'array buit i el
   `deletedIds` poblat.

Documenta el resultat del guió a l'informe final. Si no tens entorn per
executar-lo, deixa el guió escrit per a l'operador i marca-ho.

## Test plan

- Backend: ≥12 tests nous (Step 1) — són la garantia principal.
- Clients: adaptar els tests existents de l'extensió; el web no té tests de
  component (acceptat — la lògica de persistència ara és a storage.ts, que és
  testejable: afegeix tests de storage.ts en mode localStorage per a
  add/update/remove si el temps ho permet, seguint el patró de
  `src/services/claudeService.test.ts`).
- Guió E2E manual del Step 4.

## Done criteria

- [ ] `cd backend && npm test` → verd amb els endpoints nous coberts
- [ ] `grep -rn "getBookmarks()" extension/shared/api.ts` dins `saveBookmark` → 0 (el GET+POST-all ha desaparegut)
- [ ] `grep -n "storage.saveBookmarks" src/App.tsx` → 0
- [ ] Tots els tests i builds dels 4 paquets → verds
- [ ] Guió E2E del Step 4 executat (o lliurat a l'operador)
- [ ] README + backend/README.md actualitzats amb els endpoints nous
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- 003/004/007 no estan DONE a l'índex.
- En inventariar els llocs d'escriptura d'App.tsx en trobes que NO són a la
  taula de "Current state" → atura't i reconcilia l'inventari abans de tocar res.
- L'adaptació dels tests de l'extensió (Step 2) demana canviar la SEMÀNTICA
  d'algun test (no només el mock) → reporta: pot indicar que el contracte del
  missatge SAVE_BOOKMARK ha canviat sense voler.
- Qualsevol moment en què els tests de caracterització del backend legacy
  fallin: els endpoints vells NO han de canviar de comportament.

## Maintenance notes

- **Desplegament en dues fases obligatori**: primer el backend al VPS (additiu,
  els clients vells segueixen funcionant amb els endpoints legacy), DESPRÉS
  els clients (web redeploy, extensió rebuild+reload, mobile redeploy). Mai a
  l'inrevés.
- Els endpoints legacy es poden retirar en una iteració futura quan tots els
  clients desplegats usin els granulars (excepte `POST /categories` — reorder
  — i els buidatges).
- Si mai s'afegeix refetch periòdic o websockets, el dedupe per
  `id`/`originalLink` del servidor ja hi juga a favor.
