// PM2 process config pel backend (vps-server.js, desplegat al VPS com a server.js).
//
// --env-file=.env (nadiu de Node ≥20.6, no cal 'dotenv') fa que API_SECRET i
// DEEPSEEK_API_KEY es llegeixin d'un fitxer persistent al disc en lloc de dependre
// de variables exportades manualment al shell on es fa 'pm2 start'. Sense això,
// un 'pm2 startup'/resurrect pot rellançar el procés sense aquestes variables
// (com va passar el 2026-07: pm2 va perdre API_SECRET i DEEPSEEK_API_KEY en
// bootstrapejar un altre projecte al mateix VPS).
//
// El .env NO es committeja (gitignored) — crea'l al VPS amb les variables
// API_SECRET i DEEPSEEK_API_KEY.
module.exports = {
  apps: [
    {
      name: 'ai-bookmarks',
      script: 'server.js',
      cwd: __dirname,
      node_args: '--env-file=.env',
      autorestart: true,
    },
  ],
};
