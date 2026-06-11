# Plan 008: Deixar `npx eslint .` a zero errors sense canviar comportament

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `npx eslint . 2>&1 | tail -3` — si el recompte
> d'errors difereix molt de 17, la llista d'aquest pla pot estar desfasada:
> regenera-la amb eslint i aplica els mateixos criteris per regla.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (canvis de tipus i anotacions; cap canvi de runtime)
- **Depends on**: none (si els plans 005/006/007 ja s'han executat, algunes línies hauran ballat — el drift check ho cobreix)
- **Category**: dx
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

`npm run lint` falla amb 17 errors. Un baseline vermell fa que ningú executi
el lint i que els errors nous quedin camuflats entre els vells. Tots els
errors són de tipus/estil (`any` explícits, una variable `let` que hauria de
ser `const`, un import no usat, una regex amb caràcters de control i un
accés-abans-de-declaració al mòbil) — cap fix ha de canviar comportament.

## Current state

`npx eslint .` al commit `84c672a` (17 errors):

| Fitxer | Línia | Regla | Fix prescrit |
|---|---|---|---|
| `extension/popup/popup.tsx` | 231, 303 | no-explicit-any | tipar amb el tipus real (catch d'errors → `unknown` + `instanceof Error`) |
| `extension/shared/api.ts` | 5 | no-explicit-any | `data?: any` → `data?: unknown` (només se serialitza amb JSON.stringify) |
| `extension/shared/types.ts` | 24, 29 | no-explicit-any | `data?: any` als tipus `Message`/`MessageResponse` → `data?: unknown` amb les adaptacions de casts als consumidors que calgui — vegeu Step 2 |
| `extension/tests/tabs-save.test.ts` | 3 | no-unused-vars | eliminar `Bookmark` de l'import |
| `mobile/src/App.tsx` | 41 | react-hooks/immutability (accés abans de declaració) | moure la declaració de `loadData` ABANS del `useEffect` que el crida (o convertir-lo en arrow const declarada abans) |
| `src/App.tsx` | 346, 362 | no-explicit-any | la migració llegeix camps llegats: declarar un tipus local `type LegacyBookmark = Bookmark & { category?: string }` i usar-lo |
| `src/App.tsx` | 602 | no-explicit-any | `catch (error: any)` → `catch (error: unknown)` + narrowing (`error instanceof Error`) — fixa't que el codi llegeix `.name` i `.message` |
| `src/App.tsx` | 628 | prefer-const + no-explicit-any | `let rawData: any` → `const rawData: unknown` + narrowing o casts puntuals on s'accedeixen `.backupVersion`, `.bookmarks`, `.categories`, `.deletedIds` |
| `src/App.tsx` | 814, 918 | no-explicit-any | `(u: any) => u.expanded_url` → tipar amb `{ expanded_url: string }` (el tipus ja existeix a `TweetRaw.entities.urls`) |
| `src/services/claudeService.ts` | 16 | no-control-regex | la regex és INTENCIONADA (neteja caràcters de control de tweets): `// eslint-disable-next-line no-control-regex` amb comentari del perquè |
| `src/services/storage.ts` | 17 | no-explicit-any | `data?: any` → `data?: unknown` |
| `src/types.ts` | 16 | no-explicit-any | `[key: string]: any` a `TweetRaw` → `[key: string]: unknown` (els exports de Twitter porten camps extres) |

Configuració del lint: `eslint.config.js` (root, flat config). NO la
modifiquis per silenciar regles globalment.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Lint | `npx eslint .` | exit 0 al final |
| Typecheck root | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Tests root | `npm run test` | 35 passen |
| Tests extensió | `cd extension && npm run test` | 23 passen |
| Tests mobile | `cd mobile && npm run test` | passen |
| Builds | `npm run build` i `cd extension && npm run build` i `cd mobile && npm run build` | exit 0 |

## Scope

**In scope** (només els fitxers de la taula):
- `extension/popup/popup.tsx`, `extension/shared/api.ts`, `extension/shared/types.ts`, `extension/tests/tabs-save.test.ts`
- `mobile/src/App.tsx`
- `src/App.tsx`, `src/services/claudeService.ts`, `src/services/storage.ts`, `src/types.ts`
- `plans/README.md` (fila d'estat)

**Out of scope** (NO fer):
- Canviar `eslint.config.js` (cap regla desactivada globalment).
- Refactors més enllà del mínim per tipar (no reordenar funcions que no calgui,
  no canviar lògica, no «aprofitar per netejar»).
- `// eslint-disable` és l'últim recurs i només on aquest pla l'autoritza
  explícitament (claudeService regex; mobile si el fix de moure la funció
  resultés impossible — no ho és).

## Git workflow

- Branch: `advisor/008-lint-clean`. Un commit per fitxer o per grup lògic.

## Steps

### Step 1: Fixos mecànics (unused import, prefer-const, `unknown` simples)

`extension/tests/tabs-save.test.ts:3`, `extension/shared/api.ts:5`,
`src/services/storage.ts:17`, `src/types.ts:16`.

Per als `data?: unknown` d'`apiRequest`: el body només fa
`JSON.stringify(data)`, així que `unknown` no requereix cap altre canvi.

**Verify**: `npx eslint extension/tests/tabs-save.test.ts extension/shared/api.ts src/services/storage.ts src/types.ts` → 0 errors; typecheck root i extensió OK.

### Step 2: Tipus de missatgeria de l'extensió

`extension/shared/types.ts:24,29` (`Message.data`, `MessageResponse.data` →
`unknown`). Després `cd extension && npx tsc --noEmit` (o `npm run build`)
dirà exactament quins consumidors necessiten narrowing — espera'ls a
`popup.tsx` i `background/service-worker.ts`. Resol-los amb casts locals al
tipus concret del missatge (p. ex. `message.data as Bookmark` al handler
`SAVE_BOOKMARK`), que documenten el contracte real de cada missatge.

**Verify**: `cd extension && npm run build` → exit 0; `npm run test` → 23 passen.

### Step 3: mobile/src/App.tsx — accés abans de declaració

Mou la funció `async function loadData() { ... }` (línies 44-91) perquè quedi
declarada ABANS del `useEffect(() => { loadData(); }, [])` (línia 40-42). És
un tall-i-enganxa del bloc sencer; no canviïs ni una línia del cos.

**Verify**: `npx eslint mobile/src/App.tsx` → 0 errors; `cd mobile && npm run test && npm run build` → OK.

### Step 4: src/App.tsx — migració, catch i urls

Aplica els fixos de la taula (línies 346, 362, 602, 628, 814, 918). Per a la
migració (346/362), el tipus local:

```ts
type LegacyBookmark = Bookmark & { category?: string }
```

i tipar `loadedBookmarks.map((b: LegacyBookmark) => ...)`. Per al 628
(`rawData`), pots usar un tipus estructural local en comptes d'`unknown` pur:

```ts
const rawData = JSON.parse(text) as {
  backupVersion?: number
  bookmarks?: unknown[]
  categories?: string[]
  deletedIds?: string[]
} & Record<string, unknown> | TweetRaw[]
```

— l'objectiu és 0 `any`, no la perfecció del modelatge; mantén els casts
existents on ja n'hi ha.

**Verify**: `npx eslint src/App.tsx` → 0 errors; `npx tsc --noEmit -p tsconfig.app.json` → exit 0.

### Step 5: claudeService — disable documentat

A `src/services/claudeService.ts:15-16`:

```ts
// Els tweets poden portar caràcters de control invisibles; netejar-los és
// el propòsit d'aquesta regex, no un accident.
// eslint-disable-next-line no-control-regex
.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
```

**Verify**: `npx eslint src/services/claudeService.ts` → 0 errors.

### Step 6: Verificació global

**Verify**: `npx eslint .` → exit 0, 0 errors. Tots els tests (root 35,
extensió 23, mobile) i els 3 builds → verds.

## Test plan

Cap test nou: el pla no canvia comportament. La xarxa són els 58+ tests
existents i els 3 builds.

## Done criteria

- [ ] `npx eslint .` → exit 0
- [ ] `grep -rn ": any" src/ extension/shared extension/popup mobile/src --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."` → 0 resultats
- [ ] Tots els tests passen (root, extensió, mobile)
- [ ] Els 3 builds passen
- [ ] Cap canvi a `eslint.config.js` (`git diff eslint.config.js` buit)
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- Un fix de tipus revela un BUG real (p. ex. un camp que mai pot existir):
  no l'arreglis aquí; anota'l a l'informe i deixa el cast amb un `// TODO`.
- El narrowing del Step 2 demana tocar més de ~10 punts de l'extensió →
  reporta abans de continuar (potser convé un tipus d'unió discriminada de
  `Message`, però és decisió de disseny per a l'operador).
- Després de tots els steps el lint encara falla amb regles NO llistades aquí
  (regles noves per drift) → arregla-les amb els mateixos criteris si són
  trivials; si no, reporta.

## Maintenance notes

- Considerar (fora d'abast) afegir `lint` al fluxe habitual (p. ex. README de
  contribució o un pre-commit). Sense això, el baseline tornarà a embrutar-se.
- El disable de `no-control-regex` és l'únic autoritzat; si n'apareixen més en
  PRs futurs, sospitar.
