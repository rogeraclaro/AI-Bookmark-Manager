# TODO — Migració Groq (històric; ara DeepSeek) (continuar aquí)

## Estat actual (2026-05-22)

Branca: `main`. La migració a Groq està **completa i integrada a main** (la branca `feature/groq-migration` ja no existeix; els seus commits són a l'historial de main).

---

## Què funciona ✅

- VPS backend amb DeepSeek (`deepseek-flash`, V4.1 Flash) desplegat i running
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

### ~~3. Fer merge a main~~ ✅
Integrat a main (branca `feature/groq-migration` eliminada).

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
      │ POST https://api.deepseek.com/chat/completions
      ▼
Groq API — openai/gpt-oss-20b
```

---

## Dades importants

| Cosa | Valor |
|---|---|
| VPS IP | `62.169.25.188` |
| Backend path | `/home/masellas-ailinksdb/backend/` |
| PM2 app name | `ai-bookmarks` |
| Backend port | `3002` |
| Groq model | `openai/gpt-oss-20b` |
| Branch activa | `main` |

---

## Prompt per la propera sessió

```
Continuem el treball a la branca `main` (migració Groq completada).
Llegeix el TODO.md a l'arrel del projecte per veure l'estat actual.

Resum ràpid:
- Tot funciona (extensió Chrome, mobile PWA, app web, VPS Groq)
- Migració Groq (històric; ara DeepSeek) completada (deploy mobile verificat, obsolets netejats, integrat a main)
```

---

*Actualitzat: 2026-05-22 — migració Groq completada i integrada a main*
