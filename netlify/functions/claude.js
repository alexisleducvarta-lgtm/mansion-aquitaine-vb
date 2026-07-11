// netlify/functions/claude.js
// Proxy sécurisé vers l'API Anthropic : la clé reste côté serveur, jamais dans le navigateur.
// À déposer dans le dépôt GitHub sous : netlify/functions/claude.js
// Puis dans Netlify → Site settings → Environment variables → ajouter ANTHROPIC_API_KEY

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY manquante dans les variables d\'environnement Netlify.' }) };
  }

  try {
    const { messages, context } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages) || !messages.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'messages requis' }) };
    }

    const system = [
      "Tu es le conseiller financier de Mansion Aquitaine (SAS Mansion Bordeaux), agence immobilière en Gironde dirigée par Alexis Leduc.",
      "Tu réponds à la question : cette dépense est-elle possible, et est-elle une bonne idée ?",
      "",
      "RÈGLES ABSOLUES :",
      "- Fonde tes chiffres UNIQUEMENT sur les données de trésorerie fournies ci-dessous. N'invente jamais un montant.",
      "- Rappelle que la TVA collectée et la provision IS N'APPARTIENNENT PAS à l'entreprise : c'est de l'argent dû à l'État.",
      "- Le matelas de sécurité ne doit pas être entamé. Si une dépense y touche, dis-le clairement.",
      "- Sois direct et concis. Si c'est une mauvaise idée, dis-le franchement, avec le chiffre à l'appui.",
      "- Attention aux charges RÉCURRENTES : elles pèsent chaque mois, pas une fois. Un leasing à 400 €/mois = 4 800 €/an d'engagement.",
      "- Tu n'es ni expert-comptable ni conseiller en investissement agréé : pour un engagement lourd ou une question fiscale, recommande de valider avec l'expert-comptable.",
      "- Réponds en français, en 5 lignes maximum sauf si on te demande un détail.",
      "",
      "=== DONNÉES DE TRÉSORERIE (temps réel) ===",
      JSON.stringify(context || {}, null, 1)
    ].join('\n');

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: messages.slice(-12)
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return { statusCode: r.status, headers, body: JSON.stringify({ error: (data && data.error && data.error.message) || 'Erreur API' }) };
    }

    const text = (data.content || [])
      .filter(function (b) { return b.type === 'text'; })
      .map(function (b) { return b.text; })
      .join('\n');

    return { statusCode: 200, headers, body: JSON.stringify({ text: text }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
