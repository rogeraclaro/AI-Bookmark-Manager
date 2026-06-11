# Plan 001: Rotar el secret de l'API i treure'l del codi font committejat

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- extension/shared/config.ts extension/shared/api.ts mobile/src/api.ts .gitignore`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (codi) / MED (operacions al VPS — coordinar amb l'operador)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

El secret que autentica TOTES les operacions de dades (`x-api-secret`) està
hardcodejat a `extension/shared/config.ts` i committejat al repo de GitHub
(`rogeraclaro/AI-Bookmark-Manager`). A més queda incrustat als bundles JS
desplegats (web, mobile, extensió). Qualsevol persona amb accés al repo o que
inspeccioni el JS del web públic pot llegir, modificar o **esborrar tota la
base de dades** del VPS. Un secret committejat està cremat encara que
s'esborri després (queda a l'historial de git): l'única solució és **rotar-lo**.

Aquest pla: (1) treu el secret del codi trackejat, (2) deixa el sistema
preparat perquè l'operador roti el valor al VPS i als clients.

**Risc residual conegut i acceptat**: el web app continua incrustant el secret
(nou) al seu bundle perquè l'arquitectura actual ho requereix (client → API
directa). Migrar a auth de sessió server-side queda fora d'abast (vegeu
`plans/011`-i-més-enllà). La mitigació real és la rotació + backups (plan 004).

## Current state

- `extension/shared/config.ts:1-9` — secret hardcodejat dues vegades:

```ts
export const API_CONFIG = {
	BASE_URL: 'https://ailinksdb.masellas.info/api',
	SECRET: '<SECRET-VALUE-REDACTED — 20 chars alfanumèrics>',
	HEADERS: {
		'Content-Type': 'application/json',
		'x-api-secret': '<mateix valor>',
	},
}
```

- `mobile/src/api.ts:2` — importa `API_CONFIG` del mateix fitxer (hereta el fix).
- `src/services/storage.ts:10-11` — el web llegeix el secret de
  `import.meta.env.VITE_STORAGE_SECRET` (fitxer `.env`, ja gitignorat). Correcte.
- `vps-server.js:12` — el servidor llegeix `process.env.API_SECRET`. Correcte
  (el valor viu a l'entorn PM2 del VPS, fora del repo).
- `.gitignore` — ja conté `.env`.
- El valor antic apareix a l'historial de git (commit `c9a4d37` el va treure
  del server però el va deixar al client). NO intentis reescriure l'historial.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests extensió | `cd extension && npm install && npm run test` | 23 tests passen |
| Tests mobile | `cd mobile && npm install && npm run test` | tests passen |
| Build extensió | `cd extension && npm run build` | exit 0, escriu a `extension/dist/` |
| Typecheck root | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |

## Scope

**In scope** (els únics fitxers a modificar/crear):
- `extension/shared/secret.ts` (crear — NO es committeja)
- `extension/shared/secret.example.ts` (crear — es committeja)
- `extension/shared/config.ts`
- `.gitignore`
- `plans/README.md` (fila d'estat)

**Out of scope** (NO tocar):
- `vps-server.js` — la rotació del valor al servidor és operació manual de
  l'operador, no canvi de codi.
- `src/services/storage.ts` — ja fa servir env var; no canviar.
- Reescriure l'historial de git (BFG/filter-repo) — decisió de l'operador,
  fora d'aquest pla.
- El valor del secret nou — **mai** ha d'aparèixer en cap fitxer trackejat ni
  en aquest pla.

## Git workflow

- Branch: `advisor/001-rotacio-secret` (o directament `main` si l'operador ho prefereix — el repo committeja a main).
- Estil de missatge observat al repo: imperatiu curt, p. ex. `remove hardcoded API_SECRET from vps-server.js`.
- NO push sense instrucció de l'operador.

## Steps

### Step 1: Crear el mòdul de secret no trackejat

Crea `extension/shared/secret.example.ts`:

```ts
// Copia aquest fitxer a secret.ts i posa-hi el valor real.
// secret.ts està gitignorat — NO el committegis mai.
export const API_SECRET = 'POSA-EL-SECRET-AQUI'
```

Crea `extension/shared/secret.ts` amb el mateix contingut (amb el placeholder;
l'operador hi posarà el valor nou al fer la rotació — Step 5).

Afegeix a `.gitignore` (a sota de la línia `.env`):

```
extension/shared/secret.ts
```

**Verify**: `git check-ignore extension/shared/secret.ts` → imprimeix la ruta (exit 0).

### Step 2: Fer que config.ts importi el secret

A `extension/shared/config.ts`, substitueix el bloc `API_CONFIG` per:

```ts
import { API_SECRET } from './secret'

export const API_CONFIG = {
	BASE_URL: 'https://ailinksdb.masellas.info/api',
	SECRET: API_SECRET,
	HEADERS: {
		'Content-Type': 'application/json',
		'x-api-secret': API_SECRET,
	},
}
```

No toquis `ERRORS`, `CLAUDE_PROXY_URL` ni `UI_STRINGS` del mateix fitxer.

**Verify**: `grep -rn "aAgYud\|x-api-secret.*['\"][A-Za-z0-9]\{15,\}" extension/ mobile/ src/ --include="*.ts" --include="*.tsx" | grep -v secret.ts | grep -v node_modules` → **cap resultat** (cap secret literal fora del fitxer gitignorat). Nota: el patró del grep és aproximat; el criteri real és que cap string de 15+ caràcters faci de valor del header.

### Step 3: Verificar que tot compila i els tests passen

**Verify**:
- `cd extension && npm run test` → 23 tests passen
- `cd extension && npm run build` → exit 0
- `cd mobile && npm run test` → tests passen
- `npx tsc --noEmit -p tsconfig.app.json` → exit 0

### Step 4: Confirmar que el valor antic ja no és al working tree

**Verify**: `git grep -I "$(git show c9a4d37^:vps-server.js | grep -o "API_SECRET = '[^']*'" | cut -d"'" -f2)" -- . ':!node_modules'` → cap resultat. (Si aquest one-liner falla per format, fes-ho manualment: mira el valor antic amb `git show c9a4d37^:vps-server.js | grep API_SECRET` i comprova amb `git grep` que no apareix a cap fitxer trackejat. NO copiïs el valor enlloc.)

### Step 5: Checklist d'operacions per a l'OPERADOR (no executor)

Documenta-ho al missatge final del teu informe. L'operador (Roger) ha de:

1. Generar secret nou: `openssl rand -hex 24` (al seu terminal; no guardar-lo en cap fitxer trackejat).
2. Al VPS (`ssh root@62.169.25.188`): actualitzar `API_SECRET` a l'entorn del procés PM2 `ai-bookmarks` (fitxer `.env` o `ecosystem.config` a `/home/masellas-ailinksdb/backend/`) i fer `pm2 restart ai-bookmarks --update-env`.
3. Localment: posar el valor nou a `.env` (`VITE_STORAGE_SECRET`) i a `extension/shared/secret.ts`.
4. Rebuild i redesplegar: `npm run build` + `./deploy-to-vps.sh` (web), `cd mobile && npm run build` + pujar `mobile/dist` al VPS, `cd extension && npm run build` + recarregar l'extensió a Chrome.
5. Verificar: obrir el web → els bookmarks carreguen; guardar un bookmark des de l'extensió → funciona.
6. (Opcional, recomanat) Considerar fer el repo de GitHub privat si no ho és, i valorar BFG per netejar l'historial.

## Test plan

No hi ha tests nous: el canvi és de configuració. La regressió queda coberta
pels 23 tests existents de l'extensió (que importen `config.ts` transitivament)
i pels builds dels tres clients (Steps 3).

## Done criteria

- [ ] `extension/shared/secret.ts` existeix i `git check-ignore` el confirma ignorat
- [ ] `extension/shared/secret.example.ts` trackejat amb placeholder
- [ ] `extension/shared/config.ts` no conté cap valor de secret literal
- [ ] `git grep` del valor antic sobre el working tree → 0 resultats
- [ ] `cd extension && npm run test` → 23 passen; `npm run build` → exit 0
- [ ] `npx tsc --noEmit -p tsconfig.app.json` → exit 0
- [ ] Checklist d'operador inclosa a l'informe final
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- `extension/shared/config.ts` no coincideix amb l'excerpt de "Current state"
  (drift).
- Els tests de l'extensió importen el secret d'una altra manera que faci
  fallar el build sense `secret.ts` present d'una forma no resoluble amb el
  placeholder.
- Trobes el secret hardcodejat en ALTRES fitxers no llistats aquí (p. ex.
  fitxers compilats trackejats com `extension/assets/*.js`): NO els editis a
  mà; informa — es regeneren amb `npm run build` i el seu destí es decideix
  al plan 010.

## Maintenance notes

- Els fitxers compilats trackejats (`extension/assets/*.js`,
  `extension/background/service-worker.js`) contenen el secret VELL fins que
  es reconstrueixin i recommittegin (o es destrackegin — plan 010). Després de
  la rotació el valor vell és inofensiu, però cal rebuild perquè l'extensió
  funcioni amb el nou.
- Qualsevol client nou ha de llegir el secret de `secret.ts` (clients TS) o
  `.env` (Vite), mai hardcodejat.
- Revisor: comprovar amb `git show` que cap commit del PR conté valors de secret.
