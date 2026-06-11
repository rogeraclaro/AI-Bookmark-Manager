# Plan 006: Persistir al servidor les categories creades des de la PWA mòbil

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- mobile/src/App.tsx mobile/src/api.ts extension/shared/api.ts`
> Si no coincideix amb "Current state", STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

Quan l'usuari crea una categoria nova des del formulari de share de la PWA
mòbil, la categoria només s'afegeix a l'estat local de React: mai s'envia al
servidor. El bookmark es desa amb una categoria que no existeix a la llista
global → al web app, `groupedBookmarks` no troba el grup i el bookmark cau a
«Sense categoria» (`src/App.tsx:1080-1093`). L'extensió Chrome fa això bé
(missatge `ADD_CATEGORY` al service worker que persisteix la llista); el mòbil
ha de fer l'equivalent.

## Current state

- `mobile/src/App.tsx:99-112` — el bug:
```tsx
async function handleAddCategory() {
  const trimmedName = newCategoryName.trim();

  if (!trimmedName) { setError(ERRORS.CATEGORY_EMPTY); return; }
  if (categories.includes(trimmedName)) { setError(ERRORS.CATEGORY_EXISTS); return; }

  setIsAddingCategory(true);
  setError('');

  setCategories(prev => [...prev, trimmedName]);
  setSelectedCategories(prev => [...prev, trimmedName]);
  setNewCategoryName('');
  setIsAddingCategory(false);
}
```
- `mobile/src/api.ts:1` — re-exporta de l'extensió, però NO `saveCategories`:
```ts
export { getBookmarks, getCategories, saveBookmark, isDuplicate } from '../../extension/shared/api';
```
- `extension/shared/api.ts:49-56` — `saveCategories(categories: string[])` ja
  existeix (POST de la llista completa).
- Patró correcte a imitar (lògica, no literal): `extension/background/service-worker.ts:59-82`
  — re-obté la llista, comprova duplicat, append, desa, actualitza estat.
- Tests del mòbil: `mobile/src/utils.test.ts` (vitest + jsdom) — patró per al test nou.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Instal·lar | `cd mobile && npm install` | exit 0 |
| Tests mobile | `cd mobile && npm run test` | tots passen |
| Build mobile | `cd mobile && npm run build` | exit 0 |

## Scope

**In scope**:
- `mobile/src/api.ts`
- `mobile/src/App.tsx` (només `handleAddCategory`)
- `mobile/src/api.test.ts` (crear)
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- `extension/shared/api.ts` — només es re-exporta, no es modifica.
- El backend.
- La resta de `mobile/src/App.tsx` (loadData, handleSave, render).

## Git workflow

- Branch: `advisor/006-mobile-categories`. Un commit.

## Steps

### Step 1: Exposar una operació d'alta de categoria a l'api del mòbil

A `mobile/src/api.ts`, re-exporta també `saveCategories` i afegeix un helper
que encapsula el fluxe re-obtenir → comprovar → desar (mateixa semàntica que
el service worker de l'extensió):

```ts
export { getBookmarks, getCategories, saveBookmark, isDuplicate, saveCategories } from '../../extension/shared/api';
import { getCategories as fetchCategories, saveCategories as persistCategories } from '../../extension/shared/api';

// Afegeix una categoria a la llista del servidor.
// Retorna la llista actualitzada (o l'actual si ja existia).
export async function addCategoryRemote(name: string): Promise<string[]> {
  const current = await fetchCategories();
  if (current.includes(name)) return current;
  const updated = [...current, name];
  await persistCategories(updated);
  return updated;
}
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0. (Si el projecte mobile no
té script de typecheck aïllat, `npm run build` fa `tsc && vite build` — usa'l.)

### Step 2: Cridar-lo des del formulari

A `mobile/src/App.tsx`, importa `addCategoryRemote` i modifica
`handleAddCategory` perquè persisteixi abans d'actualitzar l'estat local, amb
gestió d'error (l'usuari ha de saber si la categoria NO s'ha pogut desar):

```tsx
async function handleAddCategory() {
  const trimmedName = newCategoryName.trim();

  if (!trimmedName) { setError(ERRORS.CATEGORY_EMPTY); return; }
  if (categories.includes(trimmedName)) { setError(ERRORS.CATEGORY_EXISTS); return; }

  setIsAddingCategory(true);
  setError('');

  try {
    const updated = await addCategoryRemote(trimmedName);
    setCategories(updated);
    setSelectedCategories(prev => [...prev, trimmedName]);
    setNewCategoryName('');
  } catch {
    setError(ERRORS.API_ERROR);
  } finally {
    setIsAddingCategory(false);
  }
}
```

Nota: el botó ja mostra `'...'` mentre `isAddingCategory` és true
(`mobile/src/App.tsx:268-274`) — cap canvi d'UI necessari.

**Verify**: `cd mobile && npm run build` → exit 0.

### Step 3: Test

Crea `mobile/src/api.test.ts` (patró: `mobile/src/utils.test.ts`) amb mock de
`global.fetch` (vitest `vi.stubGlobal`). Casos:

1. `addCategoryRemote('Nova')` quan el servidor retorna `{data: ['Altres']}` →
   fa un POST a `/categories` amb `{data: ['Altres','Nova']}` i retorna la llista.
2. `addCategoryRemote('Altres')` quan ja existeix → NO fa cap POST i retorna
   la llista actual.
3. El GET falla (fetch rebutja) → la promesa rebutja (el caller mostra l'error).

**Verify**: `cd mobile && npm run test` → tots passen, incloent els 3 nous.

## Test plan

Cobert al Step 3. La interacció del component no es testeja (el repo no té
testing-library); la lògica de negoci queda a `addCategoryRemote`, que sí.

## Done criteria

- [ ] `cd mobile && npm run test` → exit 0 amb 3 tests nous
- [ ] `cd mobile && npm run build` → exit 0
- [ ] `grep -n "addCategoryRemote" mobile/src/App.tsx` → ≥1 (s'usa al handler)
- [ ] El handler té try/catch amb `ERRORS.API_ERROR`
- [ ] Cap fitxer fora d'abast modificat (`git status`)
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- `handleAddCategory` ja crida alguna funció de persistència (drift — algú ho
  ha arreglat) → REJECTED a l'índex.
- El test del cas 2 revela que `getCategories` de l'extensió té un
  comportament inesperat amb el mock → revisa el mock abans de tocar
  `extension/shared/api.ts`; aquest fitxer és fora d'abast.

## Maintenance notes

- Aquesta operació és GET→append→POST de la llista sencera: té la mateixa
  finestra de race que la resta del sistema (vegeu plan 011, que introduirà
  operacions granulars; quan existeixin, `addCategoryRemote` hauria de
  migrar-hi).
- Si mai s'afegeix UI de gestió de categories al mòbil (esborrar/reordenar),
  seguir el mateix patró de persistir-primer.
