# TODO — Migració Groq (continuar aquí)

## Estat actual (2026-05-22)

Estem a la branch `feature/groq-migration`. La migració és **quasi completa**. Queda netejar coses obsoletes i fer merge a main.

---

## Què s'ha fet

### VPS (desplegat i funcionant)
- [x] Nou `server.js` pujat a `/home/masellas-ailinksdb/backend/server.js`
- [x] `ecosystem.config.js` actualitzat amb `GROQ_API_KEY` i `API_SECRET`
- [x] PM2 running: `ai-bookmarks` online
- [x] Endpoint `/categorize` — extensió Chrome i mobile PWA
- [x] Endpoint `/process-tweet` — app web (importació massiva de tweets)
- [x] App web desplegada a `/home/masellas-ailinksdb/htdocs/ailinksdb.masellas.info`

### Bugs resolts
- [x] Categories mai s'assignaven — fix: `x-api-secret` header + matching normalitzat + prompt més estricte
- [x] Pàgines asiàtiques (Twitter auto-traducció) retornaven títol/descripció en idioma original — fix: prompt força SEMPRE català

### Canvis locals (commitejats a `feature/groq-migration`)
- [x] `extension/shared/config.ts` — URL canviada a `https://ailinksdb.masellas.info/api`
- [x] `extension/shared/api.ts` — afegit `x-api-secret` header a `callClaudeProxy`
- [x] `extension/popup/popup.tsx` — matching normalitzat (accents + minúscules) per categories
- [x] `src/services/claudeService.ts` — URL actualitzada
- [x] `vps-server.js` — còpia local actualitzada (prompt estricte + sempre català)
- [x] Builds fets: app web i extensió ✅

---

## Què falta per completar

### 1. Provar mobile PWA (si cal)
- [ ] Compartir una URL des del mòbil → categories assignades correctament

### 2. Eliminar coses obsoletes
- [ ] Carpeta `proxy/` sencera (el proxy local ja no cal)
- [ ] Fitxer `vps-categorize-patch.js` (substituït pel nou server.js)

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
Mobile PWA
App Web
      │
      │ POST https://ailinksdb.masellas.info/api/categorize
      │ POST https://ailinksdb.masellas.info/api/process-tweet
      ▼
VPS Backend (/home/masellas-ailinksdb/backend/server.js)
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

*Actualitzat: 2026-05-22*
