const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

export async function generateWeeklySummary(transactions) {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key) throw new Error('VITE_GEMINI_KEY not set');

  const simplified = transactions.map(t => ({ category: t.category, amount: t.amount }));

  const prompt = `You are a funny but honest financial advisor for an Indian college student. Analyse these weekly expenses and write exactly 3 short punchy one-sentence observations about their spending. Be relatable, slightly funny, not preachy. Return ONLY a JSON array of exactly 3 strings. No markdown. No explanation.

Expenses: ${JSON.stringify(simplified)}`;

  const response = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 512 }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    console.error('Failed to parse Gemini summary response:', text);
    return [];
  }
}
