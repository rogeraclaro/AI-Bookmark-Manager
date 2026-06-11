# Plan 002: Diagnosticar per què el share de Twitter cap a la PWA mòbil no funciona

> **Executor instructions**: Aquest és un pla de DIAGNOSI, no de fix. El
> lliurable és un informe amb la causa arrel demostrada amb evidència. Si la
> causa és un canvi de codi del repo, ATURA'T i informa — el fix serà un pla
> nou o una instrucció de l'operador. Segueix els passos en ordre: estan
> ordenats per probabilitat i cost.
>
> **Drift check (run first)**: `git diff --stat 84c672a..HEAD -- mobile/ vps-server.js extension/shared/`
> Si hi ha canvis, compara els excerpts de "Current state" amb el codi viu.

## Status

- **Priority**: P1
- **Effort**: S–M (depèn d'on sigui la causa)
- **Risk**: LOW (només lectura i requests de prova contra producció)
- **Depends on**: none (però NO executar alhora que la rotació del plan 001: canviaria el secret a mig diagnòstic)
- **Category**: bug
- **Planned at**: commit `84c672a`, 2026-06-11

## Why this matters

L'operador reporta (2026-06-11) que **compartir un tweet des del mòbil cap a
la PWA ja no funciona**. Aquest fluxe funcionava el 2026-05-22 (vegeu
`TODO.md`). És la via principal d'entrada de bookmarks des del mòbil. Com que
el sistema desplegat (VPS + PWA instal·lada al telèfon) pot haver divergit del
repo, cal diagnosi sistemàtica abans de tocar codi.

## Current state (com FUNCIONA el fluxe quan va bé)

1. Twitter (app Android/iOS) → "Compartir" → PWA "AI Bookmarks" (instal·lada
   des de `https://ailinksdb.masellas.info/mobile/`).
2. El share target és un GET definit a `mobile/manifest.json:22-30`:
   ```json
   "share_target": { "action": "/mobile/", "method": "GET",
     "params": { "url": "url", "title": "title", "text": "text" } }
   ```
3. `mobile/src/main.tsx:10-22` captura els params síncronament i els desa a
   `sessionStorage.__pendingShare`. Nota: `url: rawUrl || rawText` — si
   Twitter envia la URL dins `text` (habitual), s'usa `text` com a URL.
4. `mobile/src/App.tsx:44-91` (`loadData`) llegeix `__pendingShare`, demana
   les categories (`GET /api/categories`, amb header `x-api-secret`) i crida
   `POST /api/categorize` (`mobile/src/api.ts:11-16`, també amb header).
5. El backend (`vps-server.js:139-200`) crida Groq
   (`llama-3.3-70b-versatile`) i retorna `{categories, title, description}`.
   Si Groq falla, retorna camps buits **(el formulari s'obre igualment, però
   buit)**.
6. L'usuari confirma → `saveBookmark` (GET tots + append + POST tots).

Punts de fallada coneguts per fase:
- **(A)** La PWA no s'obre en compartir → problema de manifest/instal·lació/desplegament de `/mobile/`.
- **(B)** S'obre però camps buits/sense categories → backend o Groq (model deprecat? clau caducada? server VPS divergit del repo?).
- **(C)** S'obre, s'omple, però el desat falla → API de dades / secret / nginx.

Infraestructura: VPS `62.169.25.188`, backend PM2 `ai-bookmarks` port 3002 a
`/home/masellas-ailinksdb/backend/`, nginx serveix
`/home/masellas-ailinksdb/htdocs/ailinksdb.masellas.info` i proxia `/api/` →
`localhost:3002` (`nginx-config.conf:32-47`).

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Llegir el secret localment | `grep VITE_STORAGE_SECRET .env` (NO imprimir el valor a l'informe) | existeix |
| SSH al VPS | `ssh root@62.169.25.188` | accés (si no en tens, STOP — demana a l'operador que executi els passos remots) |
| Logs del backend | `ssh root@62.169.25.188 'pm2 logs ai-bookmarks --lines 200 --nostream'` | text de logs |

## Scope

**In scope**: només lectura, requests de prova (curl) i l'informe final
`plans/002-INFORME.md`.

**Out of scope** (NO fer):
- Cap edició de codi al repo.
- Cap canvi al VPS (ni restart, ni edicions de `server.js` remot) — només
  lectura de logs i fitxers. Si cal reiniciar res, recomana-ho a l'informe.
- `POST /reset` o qualsevol request destructiva contra producció.

## Steps

### Step 1: Reproduir el fluxe per fases des de l'escriptori

Simula el share obrint al navegador (o amb curl) la URL que Twitter generaria:

```
https://ailinksdb.masellas.info/mobile/?text=https%3A%2F%2Fx.com%2Fi%2Fstatus%2F1234567890
```

**Verify**: la pàgina carrega l'app mòbil (títol "AI Bookmark Manager", fons
groc). Anota: s'obre el formulari? S'omplen títol/descripció/categories?
- Si la pàgina NO carrega (404/HTML del web principal) → fase (A): salta a Step 4.
- Si carrega però camps buits → fase (B): segueix a Step 2.
- Si tot s'omple bé → el problema és específic del telèfon (PWA instal·lada): salta a Step 5.

### Step 2: Provar el backend directament

Llegeix el secret de `.env` (no l'imprimeixis) i prova:

```bash
SECRET=$(grep VITE_STORAGE_SECRET .env | cut -d= -f2)
curl -s -X POST https://ailinksdb.masellas.info/api/categorize \
  -H "Content-Type: application/json" -H "x-api-secret: $SECRET" \
  -d '{"url":"https://x.com/i/status/123","title":"","description":"Provant un tweet sobre LLMs i agents de IA","categories":["IA","Altres"]}'
```

**Verify**: HTTP 200 amb JSON `{"categories":[...],"title":"...","description":"..."}` amb contingut en català.
- Si retorna `{"categories":[],"title":"","description":""}` → el backend
  engoleix un error de Groq: vés a Step 3.
- Si retorna 403 → el secret local no coincideix amb el del VPS (o el server
  desplegat ha canviat l'auth): vés a Step 4.
- Si retorna 502/timeout → el procés PM2 està caigut: vés a Step 4.

### Step 3: Inspeccionar logs i estat de Groq al VPS

```bash
ssh root@62.169.25.188 'pm2 status; pm2 logs ai-bookmarks --lines 200 --nostream | tail -60'
```

Busca línies `[categorize] Groq error:` o `[categorize] failed:`. Causes
probables i com confirmar-les:

- **Model deprecat**: Groq retira models; `llama-3.3-70b-versatile` pot haver
  estat descontinuat. Confirma amb la clau del VPS (sense imprimir-la):
  ```bash
  ssh root@62.169.25.188 'source /home/masellas-ailinksdb/backend/.env 2>/dev/null; curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" | head -c 2000'
  ```
  Comprova si `llama-3.3-70b-versatile` apareix a la llista. (La ubicació
  exacta de la clau al VPS pot variar: mira `pm2 env <id>` o l'ecosystem file.)
- **Clau invàlida/quota**: el mateix curl retornaria 401/429.
- **GROQ_API_KEY no definida**: el log diria `GROQ_API_KEY not set`.

**Verify**: tens una línia de log o resposta de l'API de Groq que demostra la causa.

### Step 4: Comprovar el desplegament de /mobile/ i el server real

```bash
curl -s -o /dev/null -w "%{http_code}" https://ailinksdb.masellas.info/mobile/
curl -s https://ailinksdb.masellas.info/mobile/manifest.json | head -40
ssh root@62.169.25.188 'ls -la /home/masellas-ailinksdb/htdocs/ailinksdb.masellas.info/mobile/ | head'
ssh root@62.169.25.188 'diff <(cat /home/masellas-ailinksdb/backend/server.js) -' < vps-server.js | head -50
```

**Verify**:
- `/mobile/` → 200 i el manifest conté `share_target`.
- El `diff` mostra si el server desplegat ha divergit de `vps-server.js` del
  repo. **Documenta qualsevol divergència a l'informe** (això alimenta el plan 003).

### Step 5: Verificar la PWA al telèfon (instruccions per a l'operador)

Si els Steps 1–4 no troben res, el problema és local al telèfon. Inclou a
l'informe aquesta checklist per a l'operador:

1. Obrir `https://ailinksdb.masellas.info/mobile/` a Chrome del mòbil → funciona?
2. Desinstal·lar la PWA i reinstal·lar-la ("Afegeix a la pantalla d'inici").
   El share_target només es registra en instal·lar; si el manifest va canviar
   després de la instal·lació, Android manté el registre antic.
3. Tornar a provar "Compartir" des de Twitter i mirar si "AI Bookmarks" surt a
   la llista de destins.
4. Si no hi surt: Android només mostra share targets de PWA **instal·lades** i
   amb manifest vàlid servit amb HTTPS — confirmar que la instal·lació ha anat
   bé (Chrome ⋮ → "Instal·la l'aplicació" hauria de desaparèixer un cop feta).

### Step 6: Escriure l'informe

Crea `plans/002-INFORME.md` amb: símptoma, passos executats, evidència
(outputs retallats, MAI valors de secrets ni claus), causa arrel, fix
recomanat i si el fix és (a) operació de l'operador (p. ex. canviar model de
Groq al VPS i reiniciar — anota el canvi exacte), (b) canvi de codi al repo
(p. ex. canviar el model a `vps-server.js:90` — proposa el pla), o (c)
reinstal·lació de la PWA.

## Done criteria

- [ ] `plans/002-INFORME.md` existeix amb causa arrel + evidència + fix recomanat
- [ ] Cap fitxer de codi modificat (`git status` només mostra `plans/`)
- [ ] Cap secret ni clau API apareix a l'informe
- [ ] Si s'ha detectat divergència repo↔VPS, està documentada literal a l'informe
- [ ] Fila actualitzada a `plans/README.md`

## STOP conditions

- No tens accés SSH al VPS i el diagnòstic apunta al backend → informa amb el
  que tinguis i llista els passos remots perquè els executi l'operador.
- El diagnòstic requereix executar res destructiu o reiniciar serveis → no ho
  facis; recomana-ho a l'informe.
- Detectes que el server desplegat té auth/endpoints diferents del repo → és
  troballa crítica per als plans 003/004: documenta-la i continua el diagnòstic.

## Maintenance notes

- Causa probable nº1 segons l'evidència del repo: el model
  `llama-3.3-70b-versatile` hardcodejat a `vps-server.js:90` — Groq
  descontinua models amb certa freqüència, i quan passa el backend degrada
  silenciosament a camps buits (el catch de `vps-server.js:196-199` ho amaga).
  El plan 004 afegeix logging/validació perquè això no torni a ser invisible.
- Si la causa és la reinstal·lació de la PWA, considerar versionar el manifest
  per detectar-ho abans.
