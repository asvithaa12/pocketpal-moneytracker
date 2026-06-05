const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

const VALID_CATEGORIES = new Set(['food', 'education', 'transport', 'entertainment', 'clothing', 'health', 'other']);

const SCREENSHOT_PROMPT = `This is a screenshot from a student's FamPay or PhonePe transaction history.
Extract ALL visible transactions from this image.
For each transaction return a JSON object with exactly these keys:
- amount: number (INR, positive number only, no symbols)
- merchant: string (shop/merchant name as shown, keep it short)
- date: string (as shown in image, or null if not visible)
- type: "debit" or "credit" (debit = money spent, credit = money received)
- categoryGuess: one of exactly: food, education, transport, entertainment, clothing, health, other

Return ONLY a JSON array of objects. No markdown fences. No explanation. No extra text.
If multiple transactions are visible, include all of them.
If no transactions are visible: return []

Example output:
[{"amount":120,"merchant":"Swiggy","date":"12 Jan","type":"debit","categoryGuess":"food"},{"amount":500,"merchant":"Amazon","date":"11 Jan","type":"debit","categoryGuess":"other"}]`;

/**
 * Extract a JSON array from Gemini response text.
 */
function extractJSONArray(text) {
  if (!text) return null;

  // Strip markdown code fences
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    // If Gemini returned an object with a transactions key
    if (parsed && Array.isArray(parsed.transactions)) return parsed.transactions;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    return null;
  } catch (_) {
    // fall through
  }

  // Try to find a [...] block
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // fall through
    }
  }

  return null;
}

/**
 * Validate and normalise a single transaction item from screenshot parse.
 * Returns a clean item or null if invalid.
 */
function normaliseItem(item) {
  if (!item || typeof item !== 'object') return null;

  const amount = parseFloat(item.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const merchant = typeof item.merchant === 'string' && item.merchant.trim()
    ? item.merchant.trim()
    : 'Unknown';

  const type = item.type === 'credit' ? 'credit' : 'debit';
  const categoryGuess = VALID_CATEGORIES.has(item.categoryGuess) ? item.categoryGuess : 'other';
  const date = typeof item.date === 'string' && item.date.trim() ? item.date.trim() : null;

  return { amount, merchant, date, type, categoryGuess };
}

/**
 * Parse a screenshot using Gemini Vision.
 * Returns an array of validated transaction items, or throws on hard failure.
 * Returns [] when no transactions are found.
 */
export async function parseScreenshot(base64Image, mimeType = 'image/jpeg') {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key) {
    console.error('[screenshotParser] VITE_GEMINI_KEY not set');
    throw new Error('Gemini API key not configured');
  }

  console.log('[screenshotParser] request mimeType:', mimeType, 'base64 length:', base64Image.length);

  let response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SCREENSHOT_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    });
  } catch (networkErr) {
    console.error('[screenshotParser] network error:', networkErr);
    throw new Error('Network error — check your connection');
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('[screenshotParser] Gemini HTTP error:', response.status, errBody);
    throw new Error(`Gemini API error (${response.status})`);
  }

  const data = await response.json();
  console.log('[screenshotParser] raw response:', JSON.stringify(data));

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[screenshotParser] extracted text:', rawText);

  if (!rawText) {
    console.warn('[screenshotParser] empty text response');
    return [];
  }

  const items = extractJSONArray(rawText);
  if (!items) {
    console.error('[screenshotParser] JSON extraction failed from:', rawText);
    throw new Error('Could not extract transactions from AI response');
  }

  const validated = items.map(normaliseItem).filter(Boolean);
  console.log('[screenshotParser] validated items:', validated.length);

  return validated;
}
