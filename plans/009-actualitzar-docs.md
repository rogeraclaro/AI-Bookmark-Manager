# Plan 009: Substituir la documentació activament falsa per documentació verificada contra el codi

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- README.md TODO.md TRIAL-OPTIMIZATION.md nginx-config.conf backend/ vps-server.js`
> Aquest pla assumeix que el plan 003 ja s'ha executat (backend a `backend/`).
> Si `backend/` no existeix encara, adapta les referències a `vps-server.js` i
> anota-ho a l'informe.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW (només fitxers .md i un comentari de config)
- **Depends on**: plans/003-backend-al-repo-amb-tests.md (suau — vegeu drift check)
- **Category**: docs
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

La documentació del repo descriu un sistema que ja no existeix. El backend
d'IA va migrar de Claude proxy + Gemini a Groq el 2026-05 (commit `4d1dc74`),
però el README de 60KB encara documenta `geminiService.ts`, el model
`gemini-2.0-flash-exp` i fluxos sencers obsolets. Qualsevol persona o agent
que entri al projecte (incloent executors d'aquests plans!) partirà de
premisses falses. Documentació errònia és pitjor que documentació absent.

## Current state

- `README.md` (~60KB, en català) — VELL en gran part:
  - `:32,47` descriu el processament amb «Google Gemini».
  - `:134` llista `src/services/geminiService.ts` (no existeix; ara és `claudeService.ts` que crida el backend Groq).
  - `:251` documenta `model: 'gemini-2.0-flash-exp'`.
  - `:226-262,422-425,535,675` documenten `processBookmarksWithGemini()` (la funció real és `processBookmarksWithClaude` a `src/services/claudeService.ts:22` — nom també enganyós però NO el canviïs: és codi, fora d'abast).
- `TODO.md` — diu que la branca `feature/groq-migration` està pendent de merge; el merge ja és a `main` (commit `84c672a` i anteriors). Tot el contingut és històric.
- `TRIAL-OPTIMIZATION.md` — optimitzacions per a un trial de Google Cloud que va acabar el 2026-03-08. Mort.
- `nginx-config.conf:43` — comentari «important per requests llargs de Gemini».
- `INSTRUCCIONS-DEPLOY.md`, `INSTRUCCIONS-PORTATIL.md`, `DESTACAT-FEATURE-GUIDE.md`, `SPLIT-TWEETS-README.md`, `parcial.md` — estat desconegut: AUDITA'LS (Step 1).
- Arquitectura REAL (verificada al codi, 2026-06-11):
  - 3 clients: web app (`src/`, React 19 + Vite), extensió Chrome MV3 (`extension/`), PWA mòbil share-target (`mobile/`).
  - Tots tres → `https://ailinksdb.masellas.info/api` (nginx → Express port 3002 al VPS).
  - Backend: Express + fitxer `db.json`; IA via Groq (`llama-3.3-70b-versatile`); endpoints `/bookmarks|/categories|/deleted|/categorize|/process-tweet` (i `/reset` fins que el plan 004 l'elimini).
  - Auth: header `x-api-secret` compartit.
  - Comandes: `npm run dev|build|lint|test` (root); `extension/` i `mobile/` tenen els seus `npm run build|test`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Verificar afirmacions | `git grep -n "<terme>" -- ':!node_modules' ':!plans'` | segons el cas |
| Build (per verificar comandes documentades) | `npm run build` | exit 0 |

## Scope

**In scope**:
- `README.md` (reescriure)
- `TODO.md` (substituir)
- `TRIAL-OPTIMIZATION.md` (eliminar)
- `nginx-config.conf` (només el comentari de la línia 43)
- `INSTRUCCIONS-DEPLOY.md`, `INSTRUCCIONS-PORTATIL.md`,
  `DESTACAT-FEATURE-GUIDE.md`, `SPLIT-TWEETS-README.md`, `parcial.md` —
  només després de l'auditoria del Step 1, i només eliminacions/correccions
  puntuals d'afirmacions falses.
- `plans/README.md` (fila d'estat)

**Out de scope** (NO tocar):
- Cap fitxer de codi (ni tan sols per arreglar el nom enganyós
  `processBookmarksWithClaude` — deute conegut, fora d'abast).
- `docs/plans/` — plans històrics d'una feature ja feta; no els reescriguis.
- `.planning/` — artefactes d'una eina de planificació; no els toquis.
- `backend/README.md` — el va escriure el plan 003 i és correcte.

## Git workflow

- Branch: `advisor/009-docs-refresh`. Un commit per fitxer gran (README) +
  un per a la resta.

## Steps

### Step 1: Auditar els .md secundaris

Per a cada un d'`INSTRUCCIONS-DEPLOY.md`, `INSTRUCCIONS-PORTATIL.md`,
`DESTACAT-FEATURE-GUIDE.md`, `SPLIT-TWEETS-README.md`, `parcial.md`:
llegeix-lo i classifica'l: (a) correcte → no tocar; (b) parcialment fals →
corregir només les afirmacions falses (verificant cada una contra el codi);
(c) obsolet del tot (com TRIAL) → proposar eliminació a l'informe, NO
eliminar-lo sense que l'operador ho confirmi (només TRIAL-OPTIMIZATION.md té
eliminació pre-autoritzada per aquest pla).

Pistes de falsedat a buscar: «Gemini», «Claude proxy», «proxy/», «port 3001»,
«localhost:3838» (aquest és real — host_permission de l'extensió—, comprova-ho
abans de marcar-lo), referències a `vps-server.js` si el plan 003 ja l'ha mogut.

**Verify**: llista de classificació (a/b/c) per fitxer a l'informe final.

### Step 2: Reescriure README.md

Substitueix el README sencer per una versió CONCISA (objectiu: <300 línies) i
100% verificada. Estructura:

1. **Què és** — gestor de bookmarks amb categorització per IA; 3 clients + backend VPS.
2. **Arquitectura** — el diagrama del TODO.md actual (línies 40-54) és correcte i recent: reutilitza'l (adaptant la ruta del backend si el plan 003 s'ha executat).
3. **Estructura del repo** — arbre breu d'1 nivell amb una línia per directori (verifica amb `ls`).
4. **Desenvolupament** — taula de comandes per paquet (root/extension/mobile/backend) amb què fa cadascuna. Verifica CADA comanda executant-la o llegint el package.json corresponent.
5. **Configuració** — variables d'entorn per paquet (referencia `.env` exemple de cada lloc; MAI valors).
6. **Desplegament** — web: `deploy-to-vps.sh`; backend: remet a `backend/README.md`; mobile: build + rsync del dist (mira INSTRUCCIONS-DEPLOY.md per confirmar el procediment real abans de documentar-lo).
7. **Decisions** — 3 línies: per què Groq (migració 2026-05 des de Claude proxy + Gemini, commit `4d1dc74`), per què fitxer JSON com a BD (single-user), on és el deute conegut (`plans/README.md`).

Regla: cada afirmació tècnica que escriguis l'has verificada amb `git grep`,
`ls` o llegint el fitxer. Si no la pots verificar, no l'escriguis.

**Verify**: `grep -ci "gemini" README.md` → 0 o només dins la nota històrica de la secció 7; `grep -c "geminiService\|processBookmarksWithGemini" README.md` → 0.

### Step 3: Substituir TODO.md i eliminar TRIAL-OPTIMIZATION.md

`TODO.md` nou (curt): estat actual (migració Groq completada i mergejada),
remissió a `plans/README.md` per al deute i treball pendent, i conserva la
taula «Dades importants» (línies 58-68 de l'actual: IP del VPS, paths, PM2,
port, model) actualitzant la fila «Branch activa» → `main`.

`git rm TRIAL-OPTIMIZATION.md`.

**Verify**: `grep -c "feature/groq-migration" TODO.md` → 0 (o només com a nota històrica); `ls TRIAL-OPTIMIZATION.md` → no existeix.

### Step 4: Comentari de nginx i correccions del Step 1

- `nginx-config.conf:43`: «(important per requests llargs de Gemini)» → «(important per requests llargs de l'API d'IA)».
- Aplica les correccions classificades (b) al Step 1.

**Verify**: `git grep -in "gemini" -- ':!node_modules' ':!plans' ':!docs' ':!.planning'` → 0 resultats fora de notes històriques explícites.

## Test plan

No aplica (docs). La «verificació» és el procés del Step 2: cap afirmació
sense comprovar.

## Done criteria

- [ ] README nou <300 línies, cada comanda documentada existeix al package.json corresponent
- [ ] `git grep -il "processBookmarksWithGemini\|geminiService" -- ':!node_modules' ':!docs' ':!.planning'` → 0 fitxers
- [ ] TODO.md reflecteix l'estat real (migració feta, branca main)
- [ ] TRIAL-OPTIMIZATION.md eliminat
- [ ] Informe amb la classificació (a/b/c) dels 5 .md secundaris
- [ ] Cap fitxer de codi modificat
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- En verificar una afirmació trobes una discrepància greu codi↔realitat que
  no és documental (p. ex. una comanda de build trencada) → anota-la a
  l'informe i continua; NO l'arreglis aquí.
- `parcial.md` o algun altre fitxer resulta contenir dades personals o
  secrets → no el citis; reporta'l com a candidat a eliminació.

## Maintenance notes

- El README nou és curt expressament: el detall viu al codi i als README de
  paquet. Resistir la temptació de tornar-lo a fer enciclopèdic.
- Quan s'executin els plans 004 (elimina `/reset`) i 011 (endpoints nous),
  actualitzar la llista d'endpoints del README.
