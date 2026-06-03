const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

const SYSTEM_PROMPT = `You are a transaction parser for an Indian student expense tracker.
Extract these fields from the user's spoken input:
- amount: number in INR (just the number, no symbol)
- category: one of exactly: food, education, transport, entertainment, clothing, health, friend_gave, other
- subcategory: one of exactly: cash, fampay, phonepe, online — default to cash if not mentioned
- description: short clean 2-4 word label
- friendName: extract the person's name ONLY if category is friend_gave, else null

Mapping rules (apply strictly):
books / stationery / notes / pen / xerox / notebook → education
canteen / food / lunch / dinner / snack / tea / chai / breakfast → food
auto / bus / uber / ola / metro / cab / rick → transport
movie / game / spotify / recharge / netflix / prime → entertainment
gave [name] / paid for [name] / lent [name] → friend_gave category, extract friendName
fampay / fam pay → subcategory: fampay
phonepe / phone pe / gpay / google pay / upi → subcategory: phonepe
online / swiggy / zomato / amazon / flipkart / myntra → subcategory: online

Return ONLY a single valid JSON object. No markdown. No explanation. No backticks.
If you cannot parse: return { "error": "could not parse" }`;

export async function parseVoiceTranscript(transcript) {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key) throw new Error('VITE_GEMINI_KEY not set');

  const response = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nUser input: "${transcript}"`
        }]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Gemini voice response:', text);
    return { error: 'could not parse' };
  }
}
