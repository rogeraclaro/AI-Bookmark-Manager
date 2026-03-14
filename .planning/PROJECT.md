# AI Bookmark Manager

## What This Is

Gestor personal de bookmarks basat en AI, compost per una web app (React SPA) i una extensió de Chrome. Permet importar tweets de Twitter/X i guardar pàgines web com a bookmarks, processant-los amb Claude via servidor local proxy per categoritzar-los, titular-los i resumir-los automàticament. Ús estrictament personal, accessible des de múltiples dispositius via VPS.

## Core Value

L'usuari pot capturar qualsevol contingut web (pàgines, tabs obertes, tweets) i trobar-lo més tard organitzat per categories, sense gestió manual.

## Requirements

### Validated

<!-- Funcionalitats existents i en producció. -->

- ✓ Importació de tweets des d'arxius JSON de Twitter/X — existent
- ✓ Processament batch de tweets amb AI (categorització, títol, descripció) — existent
- ✓ Extensió Chrome per guardar pàgina actual com a bookmark — existent
- ✓ Categorització automàtica al guardar des de l'extensió — existent
- ✓ Gestió de categories (crear, eliminar) — existent
- ✓ Web app per navegar i filtrar bookmarks — existent
- ✓ Emmagatzematge via API REST al VPS (fitxer JSON) — existent
- ✓ Fallback a localStorage si no hi ha API configurada — existent
- ✓ Detecció de duplicats — existent
- ✓ Suport multilingüe (català/anglès) — existent
- ✓ Servidor local proxy Claude (LaunchAgent macOS) — v1.0
- ✓ `claudeService.ts` substitueix `geminiService.ts` — v1.0
- ✓ Categorització via Claude al guardar des de l'extensió (single-save i bulk) — v1.0
- ✓ Fallback graceful si proxy no accessible — v1.0
- ✓ Feature pestanyes Chrome: filtre, multi-select, bulk save amb status inline — v1.0

### Active

<!-- Scope del proper milestone. -->

- [ ] Indicador visual a la UI quan el proxy local no és accessible (V2-01)
- [ ] Re-categorització manual d'un bookmark existent via Claude (V2-02)
- [ ] Suport per a models Claude configurables (Haiku / Sonnet) des de la UI (V2-03)

### Out of Scope

- Base de dades externa (Supabase, PostgreSQL, etc.) — JSON al VPS és suficient per ús personal
- Accés public / multi-usuari — ús personal exclusivament
- AI des del VPS — AI sempre s'executa localment des del Mac
- OAuth / sistema d'autenticació — no necessari per ús personal

## Context

**Estat actual (v1.0 shipped 2026-03-14):**
- Web app React (SPA) servida pel VPS — ~4,084 línies TypeScript/TSX
- Extensió Chrome MV3 amb popup, content script i service worker
- API REST al VPS que llegeix/escriu a fitxers JSON
- Servidor local proxy Node.js (port 3838) auto-start via LaunchAgent macOS
- Claude (Anthropic) cridat des del proxy via CLI session local — Gemini completament eliminat
- 28/28 vitest tests en verd; build net sense errors TypeScript

**Entorn de l'usuari:**
- Mac mini + MacBook Air, ambdós amb Claude Code CLI autenticat via Pro subscription
- Cap dels dos Macs és sempre encès — AI disponible quan el Mac és encès (sempre és el cas quan s'usa el browser)
- VPS serveix la UI, accessible des de qualsevol dispositiu

**Deute tècnic conegut:**
- `proxy/test/proxy.test.mjs` usa `node:test` TAP syntax incompatible amb vitest runner — `npm test` exits 1, però 28/28 vitest tests passen. Pre-existent, documentat.
- `src/App.tsx.bak2` (53KB) — arxiu backup ancient, tracked a git. Candidat per cleanup futur.
- 3 comportaments runtime pendents de confirmació humana: (1) LaunchAgent persistència entre logins, (2) extensió E2E amb proxy running, (3) pipeline import tweets en viu amb sessió Claude CLI real.

## Constraints

- **Tech stack**: React + Vite + TypeScript + Tailwind — sense canvis
- **Storage**: JSON al VPS via API REST existent — sense canvis
- **AI provider**: Claude (Anthropic) via CLI session local — Gemini substituït completament
- **Desplegament AI**: Sempre local (Mac) — mai al VPS
- **Plataforma**: macOS (LaunchAgent per auto-start del servidor local)
- **Chrome Extension**: MV3 — restriccions de permisos de la plataforma

## Key Decisions

| Decisió | Raonament | Outcome |
|---------|-----------|---------|
| Servidor local proxy per Claude | El CLI session no és accessible des del browser directament; el proxy llegeix el token localment i el fa servir | ✓ Funciona — LaunchAgent auto-start verificat |
| Mantenir JSON al VPS (no Supabase) | Ús personal, un sol usuari, zero necessitat de DB relacional | ✓ Correcte — cap problema de concurrència |
| AI sempre local (mai al VPS) | VPS no té CLI session; el Mac sempre és encès quan l'usuari usa el browser | ✓ Correcte — arquitectura neta |
| Tabs feature al popup de l'extensió | On ja existeix UI per gestionar bookmarks; accés directe a chrome.tabs API | ✓ Bona decisió — UI natural, chrome.tabs API directa |
| execFile → spawn per claude CLI | execFile penjava indefinidament quan Node.js spawna el CLI; spawn amb stdio configurat resol el problema | ✓ Fix crític — sense ell el proxy penjava a cada petició |
| 3-tier category fallback a single-save | Claude → user selection → Altres — parity amb handleBulkSave | ✓ Consistent UX entre save paths |

---
*Last updated: 2026-03-14 after v1.0 milestone*
