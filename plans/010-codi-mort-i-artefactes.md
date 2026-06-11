# Plan 010: Eliminar el codi mort d'App.tsx i ordenar els artefactes compilats de l'extensió

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- src/App.tsx extension/`
> La Part A depèn de números de línia d'App.tsx al commit `84c672a`; si els
> plans 007/008 ja s'han executat les línies hauran ballat — localitza per
> NOM DE SÍMBOL, no per línia.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (Part A) / MED (Part B — requereix decisió de l'operador)
- **Depends on**: cap formalment; recomanat DESPRÉS de 007 i 008 per minimitzar conflictes a App.tsx
- **Category**: tech-debt
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

**Part A — codi mort**: `src/App.tsx` arrossega un fluxe de revisió de tweets
antic (`tweetsToEdit`/`currentEditIndex`) substituït pel fluxe «carousel».
L'estat `tweetsToEdit` només s'escriu mai amb `setTweetsToEdit([])` — sempre
buit — així que `handleReviewTweetSave` i la branca del botó que el crida són
**inabastables** (~70 línies). En un fitxer de 2.146 línies, cada línia morta
confon el següent lector (humà o agent).

**Part B — artefactes compilats**: l'extensió té els resultats de build
COMMITTEJATS al costat dels fonts (`extension/background/service-worker.js`
vs `.ts`, `extension/content/content.js`, `extension/assets/*.js`). El
`manifest.json` de l'arrel d'`extension/` els referencia, cosa que indica que
l'extensió es pot estar carregant *unpacked* des de l'arrel — amb el risc que
els `.js` committejats estiguin DESFASATS respecte als `.ts` (i contenen el
secret antic, vegeu plan 001). Hi ha un build correcte cap a `extension/dist/`
que ja inclou còpia del manifest. Cal una sola font de veritat.

## Current state

Part A (línies del commit `84c672a`):
- `src/App.tsx:226-227` — `const [tweetsToEdit, setTweetsToEdit] = useState<TweetRaw[]>([])` i `currentEditIndex`.
- `src/App.tsx:898-925` — `openEditModalForReviewTweet` (només cridada des de `handleReviewTweetSave`).
- `src/App.tsx:927-963` — `handleReviewTweetSave` (només cridada des de la branca morta del botó).
- `src/App.tsx:1703-1705` — el botó del modal d'edició:
```tsx
<Button onClick={tweetsToEdit.length > 0 ? handleReviewTweetSave : saveBookmark}>
  {tweetsToEdit.length > 0
    ? `${strings.modal.btnSave} (${currentEditIndex + 1}/${tweetsToEdit.length})`
    : ...}
```
  Com que `tweetsToEdit.length` és sempre 0, la branca veritable mai s'executa.
- Confirmació d'inabastabilitat: `grep -n "setTweetsToEdit" src/App.tsx` →
  només la declaració (226) i `setTweetsToEdit([])` (950, dins la pròpia
  funció morta). Cap escriptura amb contingut.

Part B:
- `extension/manifest.json` (arrel) referencia `background/service-worker.js`,
  `content/content.js`, `popup/index.html`.
- `extension/vite.config.ts` compila `.ts` → `extension/dist/` amb la mateixa
  estructura; `npm run build` hi copia el manifest i les icones
  (`copy-assets`).
- Trackejats avui (no haurien): `extension/background/service-worker.js`,
  `extension/content/content.js`, `extension/assets/api-DyDpKlVl.js`,
  `extension/assets/popup-DbKNwE_q.js`, `extension/assets/popup-C8RlBDmz.css`.
- `.gitignore` root ja conté `dist` (cobreix `extension/dist/`).

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Typecheck root | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Tests root | `npm run test` | 35 passen |
| Lint | `npx eslint src/App.tsx` | cap error NOU |
| Build extensió | `cd extension && npm run build` | exit 0, `dist/` complet |
| Tests extensió | `cd extension && npm run test` | 23 passen |

## Scope

**In scope**:
- `src/App.tsx` (només els símbols llistats a Part A)
- `extension/` artefactes trackejats llistats a Part B + `.gitignore`
- `extension/README.md` o secció al README sobre com carregar l'extensió (si Part B s'executa)
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- El fluxe «carousel» viu (`carouselTweets`, `handleCarouselSave`, etc.) — és
  el substitut funcional, NO el confonguis amb el mort.
- `rejectedTweets` i el modal de revisió (`isReviewModalOpen`) — vius.
- `extension/popup/popup.css` — font, no artefacte.
- Els fonts `.ts` de l'extensió.

## Git workflow

- Branch: `advisor/010-dead-code`. Un commit per part.

## Steps

### Step 1 (Part A): Eliminar el fluxe mort

1. Confirma la inabastabilitat tu mateix:
   `grep -n "tweetsToEdit\|currentEditIndex\|handleReviewTweetSave\|openEditModalForReviewTweet" src/App.tsx`
   → cap ús fora dels llistats a "Current state". Si n'apareix algun de nou, STOP.
2. Elimina: els dos `useState` (226-227), `openEditModalForReviewTweet`
   (898-925), `handleReviewTweetSave` (927-963).
3. Simplifica el botó (1703-1705) a:
```tsx
<Button onClick={saveBookmark}>{/* la branca else existent */}</Button>
```
   conservant el text de la branca else tal qual.

**Verify**: `npx tsc --noEmit -p tsconfig.app.json` → exit 0 (el compilador
confirma que res més els referenciava); `npm run test` → 35 passen;
`npx eslint src/App.tsx` → cap error de no-unused-vars nou.

### Step 2 (Part B): DECISIÓ DE L'OPERADOR — única font de veritat per a l'extensió

⚠️ Aquest step canvia com es carrega l'extensió a Chrome. NO l'executis sense
confirmació de l'operador. Pregunta-li:

> «L'extensió de Chrome, la tens carregada en mode desenvolupador des de
> `extension/` (arrel) o des de `extension/dist/`?»

**Si respon `extension/dist/` o accepta migrar-hi (recomanat)**:
1. `git rm --cached extension/background/service-worker.js extension/content/content.js extension/assets/api-DyDpKlVl.js extension/assets/popup-DbKNwE_q.js extension/assets/popup-C8RlBDmz.css`
2. Afegeix a `.gitignore`:
```
extension/background/service-worker.js
extension/content/content.js
extension/assets/*.js
extension/assets/*.css
```
3. `cd extension && npm run build` i comprova que `dist/` conté manifest,
   icones, popup, service-worker i content.
4. Documenta (README o `extension/README.md`): «Per carregar l'extensió:
   `npm run build` i carrega `extension/dist/` com a unpacked extension. Cal
   rebuild després de cada canvi de font (o `npm run dev` per watch).»
5. Instrueix l'operador: a `chrome://extensions`, treure l'extensió antiga i
   carregar `extension/dist/`.

**Si respon que la vol seguir carregant des de l'arrel**: deixa els artefactes
trackejats, però afegeix al README de l'extensió: «Els .js compilats estan
trackejats perquè el manifest de l'arrel els carrega; cal recompilar i
recommittejar després de cada canvi de font» — i regenera'ls ara
(`npm run build` + copiar els outputs de dist/ als llocs trackejats) perquè
com a mínim estiguin sincronitzats amb els `.ts` actuals.

**Verify**: en ambdós casos, `cd extension && npm run build && npm run test` →
exit 0 i 23 tests. En el cas A: `git ls-files extension/ | grep -E '\.(js|css)$' | grep -v config` → només `popup/popup.css` si és font (comprova-ho: el popup.css de `popup/` és font Tailwind d'entrada, NO l'esborris).

## Test plan

Cap test nou. Part A la verifica el compilador (si alguna cosa viva
referenciés el codi eliminat, `tsc` falla) + els 35 tests. Part B la verifica
el build de l'extensió + els seus 23 tests.

## Done criteria

- [ ] `grep -c "tweetsToEdit\|handleReviewTweetSave\|openEditModalForReviewTweet" src/App.tsx` → 0
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → exit 0; `npm run test` → 35 OK
- [ ] Part B: o bé els artefactes destrackejats + .gitignore + doc, o bé regenerats + doc — segons la decisió de l'operador, registrada a l'informe
- [ ] `cd extension && npm run build && npm run test` → exit 0
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- El grep del Step 1.1 troba usos NOUS de `tweetsToEdit` fora dels llistats →
  el fluxe ha revifat des del commit `84c672a`; reporta.
- No pots contactar l'operador per a la decisió del Step 2 → fes NOMÉS la
  Part A, marca el pla com a parcial a l'índex amb nota «Part B pendent de
  decisió», i llesta.
- `npm run build` de l'extensió produeix un `dist/` que difereix
  estructuralment del que el manifest espera → reporta abans de destrackejar res.

## Maintenance notes

- Després de la Part B (cas A), la rotació del plan 001 ja no deixa secrets en
  artefactes trackejats — sinergia intencionada.
- El `sanitizeText` duplicat (client `src/services/claudeService.ts:10-20` vs
  backend) queda CONSCIENTMENT sense deduplicar: viuen en runtimes diferents i
  compartir-lo demanaria un paquet comú — cost > benefici avui. Re-avaluar si
  apareix un tercer duplicat.
