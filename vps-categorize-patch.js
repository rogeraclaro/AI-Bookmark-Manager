/**
 * VPS BACKEND PATCH — Endpoint /categorize amb Gemini Flash
 *
 * Afegir aquest codi a /root/ai-bookmarks-backend/server.js
 * just ABANS de la línia: app.listen(...)
 *
 * Prerequisit al VPS:
 *   export GEMINI_API_KEY="la_teva_api_key"
 *   (o afegir-ho a l'arxiu .env / ecosystem.config.js de pm2)
 */

// ─── Endpoint: POST /categorize ───────────────────────────────────────────────
// Crida Gemini 1.5 Flash per categoritzar bookmarks des del mobile PWA
app.post('/categorize', async (req, res) => {
  const secret = req.headers['x-api-secret'];
  if (secret !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url, title, description, categories: availableCategories } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[categorize] GEMINI_API_KEY not set');
    return res.json({ categories: [], title: '', description: '' });
  }

  const categoriesStr = Array.isArray(availableCategories) && availableCategories.length > 0
    ? `CATEGORIES VÀLIDES (NOMÉS pots triar d'aquesta llista): ${availableCategories.join(', ')}`
    : 'Usa "Altres" si no encaixa en cap categoria.';

  const isTweet = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+\/status\/\d+/i.test(url || '');

  const prompt = isTweet
    ? `Ets un assistent de categorització en català. Analitza aquest tweet i retorna un JSON amb:
- title: títol curt i descriptiu (màx 80 cars)
- description: resum breu (màx 200 cars)
- categories: array d'1-2 categories de la llista vàlida

${categoriesStr}
URL: ${url}
Text del tweet: ${description || title || ''}

Retorna NOMÉS JSON vàlid, sense text addicional.`
    : `Categoritza aquest bookmark i retorna un JSON amb:
- title: títol net (màx 80 cars), en l'idioma original si és nom propi
- description: 2-3 frases resumint la pàgina, en català
- categories: array d'1-2 categories de la llista vàlida

${categoriesStr}
URL: ${url}
Títol original: ${title || ''}

Retorna NOMÉS JSON vàlid, sense text addicional.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                categories: { type: 'array', items: { type: 'string' } },
              },
              required: ['categories'],
            },
          },
        }),
      }
    );

    clearTimeout(timeout);

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[categorize] Gemini error:', geminiRes.status, err.slice(0, 200));
      return res.json({ categories: [], title: '', description: '' });
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);

    res.json({
      categories: parsed.categories || [],
      title: parsed.title || '',
      description: parsed.description || '',
    });
  } catch (err) {
    console.error('[categorize] failed:', err.message);
    res.json({ categories: [], title: '', description: '' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
