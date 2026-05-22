# TODO — Migració Groq (continuar aquí)

## Estat actual (2026-05-22, nit)

Estem a la branch `feature/groq-migration`. La migració de Claude proxy + Gemini → Groq està **quasi completa**. El backend del VPS ja funciona amb Groq. Falta resoldre un bug de categories i desplegar els builds.

---

## Què s'ha fet

### VPS (ja desplegat i funcionant)
- [x] Nou `server.js` pujat a `/home/masellas-ailinksdb/backend/server.js`
- [x] Backup del server antic a `/home/masellas-ailinksdb/backend/server.js.backup`
- [x] `ecosystem.config.js` actualitzat amb `GROQ_API_KEY` i `API_SECRET`
- [x] PM2 reiniciat amb `pm2 start ecosystem.config.js`
- [x] Verificat amb curl: retorna categories, títol i descripció en català ✅
- [x] Model: `llama-3.3-70b-versatile` via `https://api.groq.com/openai/v1/chat/completions`
- [x] Endpoint `/categorize` — per extensió Chrome i mobile PWA
- [x] Endpoint `/process-tweet` — per app web (importació massiva de tweets)

### Canvis locals (commitejats a `feature/groq-migration`)
- [x] `extension/shared/config.ts` — `CLAUDE_PROXY_URL` canviat de `localhost:3838` → `https://ailinksdb.masellas.info/api`
- [x] `src/services/claudeService.ts` — proxy URL canviat de `localhost:3838` → `https://ailinksdb.masellas.info/api`
- [x] `.env` — eliminades `VITE_API_KEY` (Gemini) i `VITE_CLAUDE_PROXY_URL`
- [x] `vps-server.js` — còpia local del nou server.js (per referència i futurs desplegaments)
- [x] `vps-server.env.example` — documenta les variables d'entorn necessàries al VPS
- [x] Builds fets: `npm run build` (app web) i `cd extension && npm run build` ✅

---

## BUG PENDENT — Categories mai s'assignen

### Símptoma
L'extensió (i possiblement el mobile) mai pre-selecciona categories. Títol i descripció funcionen bé, però categories sempre buides.

### Causa probable
A `extension/popup/popup.tsx` línia 173:
```ts
const valid = aiResult.categories.filter(c => resolvedCats.includes(c));
```
Aquest filtre és una comparació estricta de strings. Groq retorna categories que no coincideixen **exactament** amb les de la llista de l'usuari (possiblement diferències d'accents, majúscules, o noms lleugerament diferents).

Per exemple: Groq pot retornar `"IA"` però la categoria real es diu `"Intel·ligència Artificial"`, o retorna `"Eines IA"` però la real és `"Eines"`.

### Com diagnosticar
1. Connectar-se al VPS: `ssh root@62.169.25.188` (port podria no ser 22 — hi havia timeout, accedir des del panell del proveïdor)
2. Executar: `pm2 logs ai-bookmarks --lines 0`
3. Usar l'extensió en una pàgina real
4. Veure als logs exactament quines categories retorna Groq vs. quines hi ha a la llista

### Solució probable
Dues opcions:
- **Opció A (recomanada)**: Millorar el prompt del VPS perquè Groq retorni EXACTAMENT els strings de la llista (més instruccions explícites)
- **Opció B**: Afegir matching case-insensitive al filtre del popup

---

## Què falta per completar la migració

### 1. Resoldre el bug de categories (veure secció anterior)

### 2. Recarregar l'extensió a Chrome amb el nou build
- Ves a `chrome://extensions`
- Activa el mode desenvolupador
- Clica "Recarregar" a l'extensió AI Bookmark Manager
- O elimina-la i torna a carregar la carpeta `extension/dist/`

### 3. Desplegar l'app web al VPS
```bash
./deploy-to-vps.sh
```

### 4. Desplegar el mobile (si cal)
```bash
cd mobile && npm run build && ./deploy.sh
```

### 5. Provar tot end-to-end
- [ ] Extensió: guardar una pàgina web normal → categories assignades correctament
- [ ] Extensió: guardar un tweet → títol descriptiu + categories
- [ ] Extensió: guardar múltiples pestanyes
- [ ] App web: importar JSON de tweets → processat amb Groq
- [ ] Mobile PWA: compartir una URL → categories assignades

### 6. Eliminar coses obsoletes (quan tot funcioni)
- Carpeta `proxy/` sencera (el proxy local ja no cal)
- Fitxer `vps-categorize-patch.js` (substituït pel nou server.js)
- Variable `VITE_API_KEY` de Google que queda al `.gitignore` (ja eliminada del `.env`)

### 7. Fer merge a main
```bash
git checkout main
git merge feature/groq-migration
git branch -d feature/groq-migration
```

---

## Arquitectura final (quan estigui completat)

```
Extensió Chrome (qualsevol ordinador)
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
| API Secret | `aAgYYud97Kp29Lif9u0i` |
| Groq model | `llama-3.3-70b-versatile` |
| Branch activa | `feature/groq-migration` |

## Notes SSH
- El port 22 dona timeout des de la màquina local
- Accedir al VPS des del **panell web del proveïdor** o investigar quin port usa SSH

---

*Creat: 2026-05-22*
