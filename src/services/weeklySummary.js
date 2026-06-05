const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

function extractJSONArray(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch (_) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
    return null;
  }
}

export async function generateWeeklySummary(transactions) {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key) {
    console.error('[weeklySummary] VITE_GEMINI_KEY not set');
    throw new Error('Gemini API key not configured');
  }

  const simplified = transactions.map((t) => ({ category: t.category, amount: t.amount }));
  console.log('[weeklySummary] generating for', simplified.length, 'expenses');

  const prompt = `You are a funny but honest financial advisor for an Indian college student. Analyse these weekly expenses and write exactly 3 short punchy one-sentence observations about their spending. Be relatable, slightly funny, not preachy. Return ONLY a JSON array of exactly 3 strings on a single line. No markdown fences. No explanation. No extra text.
Example: ["Observation one.","Observation two.","Observation three."]

Expenses: ${JSON.stringify(simplified)}`;

  let response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
      }),
    });
  } catch (networkErr) {
    console.error('[weeklySummary] network error:', networkErr);
    throw new Error('Network error — check your connection');
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[weeklySummary] Gemini HTTP error:', response.status, errBody);
    throw new Error(`Gemini API error (${response.status})`);
  }

  const data = await response.json();
  console.log('[weeklySummary] raw response:', JSON.stringify(data));

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[weeklySummary] extracted text:', rawText);

  const parsed = extractJSONArray(rawText);
  if (!parsed) {
    console.error('[weeklySummary] JSON extraction failed from:', rawText);
    return [];
  }

  const strings = parsed
    .filter((item) => typeof item === 'string' && item.trim())
    .map((s) => s.trim())
    .slice(0, 3);

  console.log('[weeklySummary] result:', strings);
  return strings;
}
