const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

const VALID_CATEGORIES = new Set(['food', 'education', 'transport', 'entertainment', 'clothing', 'health', 'friend_gave', 'other']);
const VALID_SUBCATEGORIES = new Set(['cash', 'fampay', 'phonepe', 'online']);

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

Return ONLY a valid JSON object on a single line. No markdown fences. No explanation. No extra text.
Example: {"amount":80,"category":"food","subcategory":"cash","description":"canteen lunch","friendName":null}
If you cannot parse at all: {"error":"could not parse"}`;

/**
 * Extract JSON from Gemini response text that may contain markdown or extra prose.
 */
function extractJSON(text) {
  if (!text) return null;

  // Strip markdown code fences
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // fall through
  }

  // Find the first {...} block
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      // fall through
    }
  }

  return null;
}

/**
 * Validate and normalise a parsed voice result.
 * Returns { valid: true, data } or { valid: false, reason }
 */
function validateVoiceResult(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, reason: 'Empty response from AI' };
  }
  if (parsed.error) {
    return { valid: false, reason: `AI could not parse: ${parsed.error}` };
  }

  const amount = parseFloat(parsed.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, reason: 'Amount missing or zero — please speak the amount clearly' };
  }

  const category = VALID_CATEGORIES.has(parsed.category) ? parsed.category : 'other';
  const subcategory = VALID_SUBCATEGORIES.has(parsed.subcategory) ? parsed.subcategory : 'cash';
  const description = typeof parsed.description === 'string' && parsed.description.trim()
    ? parsed.description.trim()
    : '';
  const friendName = category === 'friend_gave' && typeof parsed.friendName === 'string' && parsed.friendName.trim()
    ? parsed.friendName.trim()
    : null;

  return {
    valid: true,
    data: { amount, category, subcategory, description, friendName },
  };
}

/**
 * Parse a voice transcript using Gemini.
 * Returns { parsed: {...} } on success or { error: 'message' } on failure.
 */
export async function parseVoiceTranscript(transcript) {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key) {
    console.error('[voiceParser] VITE_GEMINI_KEY not set');
    return { error: 'Gemini API key not configured' };
  }

  console.log('[voiceParser] request transcript:', transcript);

  let response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser input: "${transcript}"` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
    });
  } catch (networkErr) {
    console.error('[voiceParser] network error:', networkErr);
    return { error: 'Network error — check your connection' };
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[voiceParser] Gemini HTTP error:', response.status, errBody);
    return { error: `Gemini API error (${response.status})` };
  }

  const data = await response.json();
  console.log('[voiceParser] raw response:', JSON.stringify(data));

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[voiceParser] extracted text:', rawText);

  const parsed = extractJSON(rawText);
  if (!parsed) {
    console.error('[voiceParser] JSON extraction failed from:', rawText);
    return { error: 'Could not extract data from AI response' };
  }

  const validation = validateVoiceResult(parsed);
  if (!validation.valid) {
    console.warn('[voiceParser] validation failed:', validation.reason);
    return { error: validation.reason };
  }

  console.log('[voiceParser] parsed result:', validation.data);
  return { parsed: validation.data };
}
