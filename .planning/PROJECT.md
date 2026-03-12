# AI Bookmark Manager

## What This Is

Gestor personal de bookmarks basat en AI, compost per una web app (React SPA) i una extensió de Chrome. Permet importar tweets de Twitter/X i guardar pàgines web com a bookmarks, processant-los amb AI per categoritzar-los, titular-los i resumir-los automàticament. Ús estrictament personal, accessible des de múltiples dispositius via VPS.

## Core Value

L'usuari pot capturar qualsevol contingut web (pàgines, tabs obertes, tweets) i trobar-lo més tard organitzat per categories, sense gestió manual.

## Requirements

### Validated

<!-- Funcionalitats existents i en producció. -->

- ✓ Importació de tweets des d'arxius JSON de Twitter/X — existent
- ✓ Processament batch de tweets amb AI (categorització, títol, descripció) — existent (Gemini)
- ✓ Extensió Chrome per guardar pàgina actual com a bookmark — existent
- ✓ Categorització automàtica al guardar des de l'extensió — existent
- ✓ Gestió de categories (crear, eliminar) — existent
- ✓ Web app per navegar i filtrar bookmarks — existent
- ✓ Emmagatzematge via API REST al VPS (fitxer JSON) — existent
- ✓ Fallback a localStorage si no hi ha API configurada — existent
- ✓ Detecció de duplicats — existent
- ✓ Suport multilingüe (català/anglès) — existent

### Active

<!-- Scope d'aquest milestone. -->

- [ ] Substituir Gemini per Claude via servidor local proxy (LaunchAgent macOS)
- [ ] Feature de pestanyes Chrome: seleccionar tabs obertes i categoritzar-les en bulk

### Out of Scope

- Base de dades externa (Supabase, PostgreSQL, etc.) — JSON al VPS és suficient per ús personal
- Accés public / multi-usuari — ús personal exclusivament
- AI des del VPS — AI sempre s'executa localment des del Mac
- OAuth / sistema d'autenticació — no necessari per ús personal

## Context

**Arquitectura actual:**
- Web app React (SPA) servida pel VPS
- Extensió Chrome MV3 amb popup, content script i service worker
- API REST al VPS que llegeix/escriu a fitxers JSON
- Gemini API cridada des del navegador (client-side) amb `VITE_API_KEY`

**Entorn de l'usuari:**
- Mac mini + MacBook Air, ambdós amb Claude Code CLI autenticat via Pro subscription
- Cap dels dos Macs és sempre encès — AI disponible quan el Mac és encès (sempre és el cas quan s'usa el browser)
- VPS serveix la UI, accessible des de qualsevol dispositiu

**Decisió clau sobre Claude CLI:**
El CLI guarda un token d'autenticació localment. Un servidor local (Node.js, auto-start al login via LaunchAgent) llegeix aquest token i el fa servir com a proxy entre el browser/extensió i l'Anthropic API. Elimina la necessitat d'una API key separada.

## Constraints

- **Tech stack**: React + Vite + TypeScript + Tailwind — sense canvis
- **Storage**: JSON al VPS via API REST existent — sense canvis
- **AI provider**: Claude (Anthropic) via CLI session local — substitueix Gemini
- **Desplegament AI**: Sempre local (Mac) — mai al VPS
- **Plataforma**: macOS (LaunchAgent per auto-start del servidor local)
- **Chrome Extension**: MV3 — restriccions de permisos de la plataforma

## Key Decisions

| Decisió | Raonament | Outcome |
|---------|-----------|---------|
| Servidor local proxy per Claude | El CLI session no és accessible des del browser directament; el proxy llegeix el token localment i el fa servir | — Pending |
| Mantenir JSON al VPS (no Supabase) | Ús personal, un sol usuari, zero necessitat de DB relacional | — Pending |
| AI sempre local (mai al VPS) | VPS no té CLI session; el Mac sempre és encès quan l'usuari usa el browser | — Pending |
| Tabs feature al popup de l'extensió | On ja existeix UI per gestionar bookmarks; accés directe a chrome.tabs API | — Pending |

---
*Last updated: 2026-03-12 after initialization*
