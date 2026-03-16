# AI Bookmark Manager — Instal·lació al portàtil

## Requisits previs

- macOS
- Claude Code CLI instal·lat i autenticat (`claude --version` ha de funcionar al terminal)
- Node.js instal·lat (`node --version` ha de funcionar al terminal)
- Google Chrome

> Si no tens Node.js: instal·la'l des de https://nodejs.org (versió LTS)

---

## Pas 1 — Instal·lar el proxy local

El proxy és un servidor Node.js que fa de pont entre l'extensió Chrome i el Claude CLI.
Ha de córrer al portàtil sempre que vulguis guardar bookmarks amb categorització AI.

**1.1 Copia la carpeta `proxy/` a un lloc permanent:**

```bash
cp -r proxy/ ~/ai-bookmarks-proxy
```

**1.2 Instal·la les dependències:**

```bash
cd ~/ai-bookmarks-proxy
npm install
```

**1.3 Instal·la el LaunchAgent (auto-inici en login):**

```bash
bash ~/ai-bookmarks-proxy/install.sh
```

Hauries de veure:
```
Claude proxy LaunchAgent installed and started.
Logs: ~/Library/Logs/claude-proxy.log
```

**1.4 Verifica que funciona:**

```bash
curl http://localhost:3838
```

Ha de retornar alguna resposta (404 o similar) — si no penja ni dona "connection refused", el proxy corre.

Alternativament comprova els logs:
```bash
tail -f ~/Library/Logs/claude-proxy.log
```

---

## Pas 2 — Instal·lar l'extensió Chrome

**2.1 Obre Chrome i navega a:**
```
chrome://extensions/
```

**2.2 Activa el "Mode de desenvolupador"** (toggle a dalt a la dreta)

**2.3 Clica "Carrega descomprimida"** (Load unpacked)

**2.4 Selecciona la carpeta `extension-dist/`** (dins d'aquest ZIP)

L'extensió apareixerà a la llista amb la icona AI Bookmark Manager.

**2.5 Fixa l'extensió a la barra:**
Clica la icona de trencaclosques (extensions) → fixa "AI Bookmark Manager"

---

## Ús diari

1. **El proxy s'inicia automàticament** en cada login — no cal fer res
2. **Per guardar una pàgina**: clica la icona de l'extensió → "Guardar aquesta pàgina"
3. **Per guardar múltiples pestanyes**: clica la icona → pestanya "Pestanyes Obertes"
4. La web app és a: **https://ailinksdb.masellas.info** (accessible des de qualsevol dispositiu)

---

## Resolució de problemes

### L'extensió no categoritza (categories buides o error)

El proxy no corre. Comprova:
```bash
launchctl list | grep ailinks
# Ha d'aparèixer com.ailinks.claude-proxy

curl http://localhost:3838
# Ha de respondre (no "connection refused")
```

Si no corre, reinicia manualment:
```bash
launchctl load ~/Library/LaunchAgents/com.ailinks.claude-proxy.plist
```

O directament:
```bash
node ~/ai-bookmarks-proxy/server.js
```

### El proxy dona errors de Claude CLI

Verifica que Claude CLI funciona:
```bash
echo "hola" | claude -p "respon en una paraula"
```

Si falla, necessites autenticar-te:
```bash
claude
# Segueix les instruccions d'autenticació
```

### Desinstal·lar el LaunchAgent

```bash
launchctl unload ~/Library/LaunchAgents/com.ailinks.claude-proxy.plist
rm ~/Library/LaunchAgents/com.ailinks.claude-proxy.plist
```

---

## Arquitectura (resum)

```
Portàtil
├── Chrome Extension (extension-dist/)  →  guarda bookmarks
│   └── crida localhost:3838 per categoritzar via AI
├── Proxy local (~/ai-bookmarks-proxy/) →  pont Claude CLI
│   └── LaunchAgent: s'inicia automàticament en login
└── Claude CLI (ja instal·lat)          →  fa la IA

VPS (remot, sempre encès)
└── API REST + Web App                  →  emmagatzema bookmarks
    https://ailinksdb.masellas.info
```

La web app i l'API ja estan al VPS — no cal desplegar res.
