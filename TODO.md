# TODO — Migració Groq (continuar aquí)

## Estat actual (2026-05-22)

Branca: `feature/groq-migration`. La migració és **funcionalment completa**. Queda netejar obsolets i fer merge a main.

---

## Què funciona ✅

- VPS backend amb Groq (`llama-3.3-70b-versatile`) desplegat i running
- App web desplegada a `https://ailinksdb.masellas.info`
- Extensió Chrome: categories, títol i descripció correctes
- Extensió Chrome: pàgines asiàtiques (Twitter auto-traducció) → sempre en català
- Mobile PWA: share des de Twitter → modal s'obre, camps omplerts per IA
  - Quan Twitter envia text del tweet → prompt de tweet
  - Quan Twitter NO envia text (share sense contingut) → prompt genèric amb URL

---

## Pendent per completar la migració

### ~~1. Verificar mobile al VPS~~ ✅ (2026-05-22)
Deploy confirmat — fitxers al VPS del 17:28, commit f8487a3 del 17:27.

### ~~2. Netejar obsolets~~ ✅ (2026-05-22)
`proxy/` i `vps-categorize-patch.js` eliminats (commit 15791a0).

### 3. Fer merge a main
```bash
git checkout main
git merge feature/groq-migration
git branch -d feature/groq-migration
```

---

## Arquitectura final

```
Extensió Chrome
Mobile PWA  ──── share des de Twitter/X
App Web
      │
      │ POST https://ailinksdb.masellas.info/api/categorize
      │ POST https://ailinksdb.masellas.info/api/process-tweet
      ▼
VPS Backend (/home/masellas-ailinksdb/backend/server.js)
      │  PM2: ai-bookmarks, port 3002
      │
      │ POST https://api.groq.com/openai/v1/chat/completions
      ▼
Groq API — llama-3.3-70b-versatile
```

---

## Dades importants

| Cosa | Valor |
|---|---|
| VPS IP | `62.169.25.188` |
| Backend path | `/home/masellas-ailinksdb/backend/` |
| PM2 app name | `ai-bookmarks` |
| Backend port | `3002` |
| Groq model | `llama-3.3-70b-versatile` |
| Branch activa | `feature/groq-migration` |

---

## Prompt per la propera sessió

```
Continuem la migració Groq a la branca `feature/groq-migration`.
Llegeix el TODO.md a l'arrel del projecte per veure l'estat actual.

Resum ràpid:
- Tot funciona (extensió Chrome, mobile PWA, app web, VPS Groq)
- Falta: verificar deploy del mobile, netejar obsolets (proxy/, vps-categorize-patch.js) i fer merge a main

Comença verificant l'estat del deploy del mobile al VPS.
```

---

*Actualitzat: 2026-05-22 — Neteja completada, pendent merge a main*
