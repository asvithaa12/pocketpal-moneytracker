const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

const SCREENSHOT_PROMPT = `This is a screenshot from a student's FamPay or PhonePe transaction history.
Extract ALL visible transactions from this image.
For each transaction return:
- amount: number (INR, positive)
- merchant: string (shop/merchant name as shown)
- date: string (as shown in image, or null if not visible)
- type: 'debit' or 'credit'
- categoryGuess: one of: food, education, transport, entertainment, clothing, health, other

Return ONLY a JSON array. No markdown. No explanation. No backticks.
If no transactions visible: return []`;

export async function parseScreenshot(base64Image, mimeType = 'image/jpeg') {
  const key = import.meta.env.VITE_GEMINI_KEY;
  if (!key) throw new Error('VITE_GEMINI_KEY not set');

  const response = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: SCREENSHOT_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
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
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error('Failed to parse Gemini screenshot response:', text);
    return [];
  }
}
