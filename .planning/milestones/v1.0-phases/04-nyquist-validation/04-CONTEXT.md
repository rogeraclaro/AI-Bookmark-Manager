# Phase 4: Nyquist Validation - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Portar les fases completades (1, 2 i 3) a la conformitat Nyquist creant o corregint els fitxers VALIDATION.md. Cap nova funcionalitat, cap canvi de codi — només documentació de validació.

</domain>

<decisions>
## Implementation Decisions

### Abast de la correcció — Fase 1

- Correcció **completa** del VALIDATION.md existent (no mínima)
- Corregir framework: `jest 29.x` → `vitest` (el framework real usat)
- Corregir comandes de test: patrons jest → comandes vitest reals
- Actualitzar rutes de fitxers als tests reals existents (`proxy/test/proxy.test.mjs`)
- Actualitzar tots els estats de tasques a completat/verd (la Fase 1 ja és completa)
- Establir `nyquist_compliant: true` al frontmatter

### Format del VALIDATION.md — Fase 2

- Estil **post-execució**: tots els estats ja en ✅ verd des del principi
- `nyquist_compliant: true` al frontmatter
- Reflectir la realitat actual: 17/17 tests vitest en verd, verificació aprovada
- Tests reals: `extension/tests/tabs-filter.test.ts`, `tabs-save.test.ts`, `tabs-selection.test.ts`
- Comanda: `npm test` (a l'arrel de `extension/`)

### Abast de la Fase 3 — inclosa

- Crear VALIDATION.md per a la Fase 3 (`03-fix-ai03-single-save`) tot i que el roadmap no la menciona explícitament
- Mateixa decisió: estil post-execució, `nyquist_compliant: true`
- Tests reals: `extension/tests/single-save.test.ts`
- La fase ja és completa (1/1 pla executat i verificat)

### Claude's Discretion

- Estructura exacta de la taula de mapa de tasques per a Fases 2 i 3
- Nivell de detall dels requisits de Wave 0 (innecessaris si ja tot és verd)

</decisions>

<code_context>
## Existing Code Insights

### Tests reals existents

| Fase | Fitxer | Estat |
|------|--------|-------|
| Fase 1 | `proxy/test/proxy.test.mjs` | ✅ verd |
| Fase 2 | `extension/tests/tabs-filter.test.ts` | ✅ verd (17/17) |
| Fase 2 | `extension/tests/tabs-save.test.ts` | ✅ verd |
| Fase 2 | `extension/tests/tabs-selection.test.ts` | ✅ verd |
| Fase 3 | `extension/tests/single-save.test.ts` | ✅ verd |

### Infraestructura de test

- Framework: **vitest** (no jest) — `package.json` `"test": "vitest run"`, `vitest: "^4.1.0"`
- Config: `extension/vitest.config.ts`
- Comanda ràpida (extensió): `npm test` des de `extension/`
- Comanda ràpida (proxy): `node --test proxy/test/proxy.test.mjs` o equivalent

### VALIDATION.md existent amb errors (Fase 1)

- Frontmatter: `nyquist_compliant: false`, `wave_0_complete: false`
- Framework incorrecte: `jest 29.x`
- Comandes incorrectes: `npm test -- --testPathPattern=...` (sintaxi jest)
- Tots els estats: `⬜ pending` (incorrecte — fase completada)
- Fitxers referenciats no existeixen (eren stubs planejats amb jest, mai creats)

</code_context>

<specifics>
## Specific Ideas

- La Fase 1 VALIDATION.md necessita reescriptura quasi completa — conservar l'estructura però substituir tot el contingut incorrecte
- Per a Fases 2 i 3 (post-execució): no calen seccions "Wave 0 Requirements" — tot ja existeix i és verd
- Mantenir el format de frontmatter consistent entre les tres fases

</specifics>

<deferred>
## Deferred Ideas

None — la discussió s'ha mantingut dins l'abast de la fase.

</deferred>

---

*Phase: 04-nyquist-validation*
*Context gathered: 2026-03-14*
