import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface SummaryResult {
  tldr: string;
  actionItems: string[];
  keyDecisions: string[];
  nextSteps: string[];
}

export async function summarizeMeeting(transcript: string): Promise<SummaryResult> {
  console.log('[Summarize] Starting summarization, transcript length:', transcript.length);

  if (!transcript || transcript.trim().length === 0) {
    console.log('[Summarize] Empty transcript, returning empty summary');
    return {
      tldr: 'No transcript available for this meeting.',
      actionItems: [],
      keyDecisions: [],
      nextSteps: [],
    };
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a meeting summarization assistant. Analyze the following meeting transcript and return ONLY a valid JSON object with no markdown, no code blocks, no explanation — just raw JSON.

The JSON must have exactly this structure:
{
  "tldr": "2-3 sentence summary of what the meeting was about and what was accomplished",
  "actionItems": ["action item 1", "action item 2"],
  "keyDecisions": ["decision 1", "decision 2"],
  "nextSteps": ["next step 1", "next step 2"]
}

Rules:
- Return ONLY the JSON object, nothing else
- No markdown formatting
- No code fences
- If a category has nothing, return an empty array []
- Be concise and specific

Meeting transcript:
${transcript}`;

  try {
    console.log('[Summarize] Sending to Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('[Summarize] Raw Gemini response:', text.substring(0, 200));

    // Parse the JSON response safely
    const parsed = parseJsonSafely(text);

    console.log('[Summarize] Summarization completed');
    return {
      tldr: parsed.tldr || 'Summary not available.',
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      keyDecisions: Array.isArray(parsed.keyDecisions) ? parsed.keyDecisions : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    };
  } catch (error) {
    console.error('[Summarize] Error:', error);
    throw error;
  }
}

function parseJsonSafely(text: string): Partial<SummaryResult> {
  // Remove any markdown code blocks if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Summarize] JSON parse error, trying to extract JSON...', e);

    // Try to find JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error('[Summarize] Could not parse extracted JSON:', e2);
      }
    }

    return {
      tldr: 'Could not generate summary.',
      actionItems: [],
      keyDecisions: [],
      nextSteps: [],
    };
  }
}
