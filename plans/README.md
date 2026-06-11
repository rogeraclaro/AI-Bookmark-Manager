# Implementation Plans — AI Bookmark Manager

Generat per una auditoria del codi (skill `improve`) el 2026-06-11, sobre el
commit `84c672a`. Executa els plans en l'ordre de sota tret que les
dependències diguin una altra cosa. Cada executor: llegeix el pla SENCER abans
de començar, respecta les seves STOP conditions, i actualitza la teva fila
quan acabis.

## Ordre d'execució i estat

| Plan | Títol | Prioritat | Esforç | Depèn de | Estat |
|------|-------|-----------|--------|----------|-------|
| [001](001-rotacio-secret-api.md) | Rotar el secret de l'API i treure'l del codi committejat | P1 | M | — | TODO |
| [002](002-diagnosi-share-twitter-mobil.md) | Diagnosticar el share de Twitter→PWA que NO funciona (reportat 2026-06-11) | P1 | S–M | — (no en paral·lel amb 001) | TODO |
| [003](003-backend-al-repo-amb-tests.md) | Backend com a paquet del repo amb tests de caracterització | P1 | M | informe del 002 | TODO |
| [004](004-robustesa-backend.md) | Robustesa backend: escriptura atòmica, validació, backups, fora /reset | P1 | S–M | 003 | TODO |
| [005](005-auth-header-import-tweets-web.md) | Header d'auth a la importació massiva de tweets del web | P1 | S | — | TODO |
| [006](006-persistir-categories-mobil.md) | Persistir les categories creades des del mòbil | P2 | S | — | TODO |
| [007](007-fix-esborrar-ultim-bookmark.md) | Esborrar l'últim bookmark es persisteix; fora el re-desat de cada càrrega | P2 | S | — | TODO |
| [008](008-lint-net.md) | `eslint .` a zero errors | P2 | S | millor després de 005/006/007 | TODO |
| [009](009-actualitzar-docs.md) | Documentació verificada (README, TODO, obsolets) | P2 | S–M | 003 (suau) | TODO |
| [010](010-codi-mort-i-artefactes.md) | Codi mort d'App.tsx + artefactes compilats de l'extensió | P3 | S | millor després de 007/008 | TODO |
| [011](011-sync-multi-dispositiu.md) | Sync granular multi-dispositiu (fi de la pèrdua de dades) | P2 | L | 003, 004, 007 | TODO |

Valors d'estat: `TODO` | `IN PROGRESS` | `DONE` | `BLOCKED (motiu)` | `REJECTED (motiu)`.

## Notes de dependències

- **002 abans de 003**: si el share està trencat perquè el server del VPS ha
  divergit del repo, cal saber-ho ABANS de congelar `vps-server.js` en tests.
- **001 i 002 no en paral·lel**: la rotació del secret canviaria les
  credencials a mig diagnòstic.
- **003 → 004 → 011**: els tests de caracterització (003) són la xarxa dels
  canvis de robustesa (004), i tots dos ho són del redisseny del sync (011).
- **007 abans de 011**: el flag `hasLoadedRef` que introdueix el 007 és la
  semàntica que el 011 ha de conservar en substituir els efectes.
- **005, 006, 007** són independents entre si i es poden executar en paral·lel
  (toquen fitxers diferents).
- **008 i 010** toquen `src/App.tsx`: fer-los DESPRÉS de 007 (i entre ells, 008
  abans de 010) minimitza conflictes de línies.
- **Operacions al VPS**: els plans 001, 003, 004 i 011 acaben amb passos de
  desplegament que NOMÉS pot fer l'operador (SSH al VPS). El codi pot quedar
  mergejat abans; el comportament en producció no canvia fins al deploy.

## Com executar un pla (instruccions per a l'operador)

1. Obre una sessió nova de l'agent (Claude Code o equivalent) al directori
   arrel del repo. No cal cap context previ: els plans són autocontinguts.
2. Enganxa el prompt corresponent de la secció següent.
3. Quan l'agent acabi, revisa el diff (`git diff`) i l'informe abans de fer
   merge. Comprova que la fila d'aquest fitxer s'ha actualitzat.
4. Si el pla té passos d'operador (001, 002, 003, 004, 011), executa'ls tu
   seguint la checklist que l'agent t'haurà deixat a l'informe.

Recomanació de tongades:
- **Tongada 1 (urgent)**: 002 (el bug actiu del share) i després 001 (secret).
- **Tongada 2 (fonaments)**: 003 → 004, i en paral·lel 005, 006, 007.
- **Tongada 3 (qualitat)**: 008 → 009 → 010.
- **Tongada 4 (arquitectura)**: 011, quan tinguis un parell de dies.

## Prompts per a l'executor (copia i enganxa)

Prompt genèric — substitueix `NNN-slug` pel pla que toqui:

```
Ets un agent executor. Llegeix sencer el fitxer plans/NNN-slug.md d'aquest
repo i executa'l pas a pas. Regles: fes primer el drift check del pla; no
toquis cap fitxer fora del seu "In scope"; executa cada comanda de
verificació i no avancis si falla; si es compleix qualsevol STOP condition,
atura't i informa'm en comptes d'improvisar. En acabar: actualitza la fila
del pla a plans/README.md, fes commits petits amb missatges clars, NO facis
push, i dona'm un informe final amb què has canviat, què queda per a mi
(operador) i qualsevol risc detectat.
```

Prompts específics (afegeixen el context que cada pla necessita):

- **001**: `[prompt genèric amb plans/001-rotacio-secret-api.md] + «Atenció: el valor del secret NO ha d'aparèixer mai en cap fitxer trackejat, commit, ni al teu informe.»`
- **002**: `[prompt genèric amb plans/002-diagnosi-share-twitter-mobil.md] + «És un pla de DIAGNOSI: no editis codi. El lliurable és plans/002-INFORME.md. Tens accés SSH al VPS? Si no, digue-m'ho d'entrada i et passaré els outputs dels passos remots.»`
- **003**: `[prompt genèric amb plans/003-backend-al-repo-amb-tests.md] + «Abans de començar, llegeix plans/002-INFORME.md si existeix: si documenta divergència entre el repo i el server desplegat, és una STOP condition.»`
- **004**: `[prompt genèric amb plans/004-robustesa-backend.md]`
- **005**: `[prompt genèric amb plans/005-auth-header-import-tweets-web.md]`
- **006**: `[prompt genèric amb plans/006-persistir-categories-mobil.md]`
- **007**: `[prompt genèric amb plans/007-fix-esborrar-ultim-bookmark.md] + «El risc d'aquest pla és sobreescriure el servidor amb estat buit si la guarda se substitueix malament: llegeix la secció 'Per què la guarda existeix' abans de tocar res.»`
- **008**: `[prompt genèric amb plans/008-lint-net.md] + «Cap canvi de comportament: només tipus, anotacions i moviments de declaració. Si un fix de tipus revela un bug real, anota'l i no l'arreglis.»`
- **009**: `[prompt genèric amb plans/009-actualitzar-docs.md] + «Cada afirmació tècnica que escriguis l'has de verificar contra el codi amb grep/ls. Si no la pots verificar, no l'escriguis.»`
- **010**: `[prompt genèric amb plans/010-codi-mort-i-artefactes.md] + «La Part B requereix una decisió meva (des d'on carrego l'extensió a Chrome): pregunta-m'ho abans d'executar-la. Si no responc, fes només la Part A.»`
- **011**: `[prompt genèric amb plans/011-sync-multi-dispositiu.md] + «Comprova a plans/README.md que 003, 004 i 007 estan DONE abans de començar; si no ho estan, atura't. Commit per step.»`

## Troballes considerades i descartades (no re-auditar)

- **Vulnerabilitats `npm audit` (9: 4 moderate, 5 high)**: totes són de
  devDependencies; `npm audit --omit=dev` → 0. Sense valor arreglar-les ara.
- **Refactor del monòlit `src/App.tsx` (2.146 línies)**: real, però sense
  tests de component el ROI és dolent. El plan 010 en treu el codi mort; el
  011 en treu la lògica de persistència. Re-avaluar després.
- **Duplicació de `sanitizeText` client/backend**: runtimes diferents;
  compartir-lo demanaria un paquet comú. Cost > benefici (decisió al plan 010,
  Maintenance notes).
- **`processBookmarksWithClaude` amb nom enganyós (crida Groq)**: cosmètic;
  tocar-lo embruta diffs d'altres plans. Anotat al plan 009 com a deute conegut.
- **`isDuplicate` descarrega tots els bookmarks per comprovar 1 URL**
  (`extension/shared/api.ts:76-85`): ineficient però acceptable a l'escala
  actual; el plan 011 deixa la porta oberta a un endpoint de check si mai cal.
- **Login del web app client-side (hash SHA-256 al bundle)**: cosmètic per
  disseny (amaga botons); la seguretat real és el secret de l'API. Documentat
  com a risc residual al plan 001. Auth server-side seria una iteració futura.

## Direcció (opcions de producte, no executades)

- **Consolidar la PWA mobile dins del web app** (share target al web,
  eliminar `mobile/`): estalviaria un subprojecte duplicat. No planificat —
  decisió de producte de l'operador.
- **Backend dins del repo**: absorbit als plans 003/004.
