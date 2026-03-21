import type { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return Response.json({}, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, scenario } = await request.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400, headers: CORS_HEADERS });
    }

    if (message.length > 500) {
      return Response.json({ error: 'Message too long' }, { status: 400, headers: CORS_HEADERS });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return Response.json({ error: 'Server configuration error' }, { status: 500, headers: CORS_HEADERS });
    }

    const systemPrompt = `You are Tuti 🦜 — a friendly AI language teacher for people from Tajikistan learning Russian and English.

RULES:
- Keep answers SHORT (max 3-4 sentences)
- If user writes in Russian — check for mistakes, correct them kindly, explain in Tajik
- If user writes in Tajik — translate to Russian and teach the phrase
- If user writes in English — help them practice, explain in Tajik

RESPONSE FORMAT:
🇷🇺 [Russian text / correction]
🇹🇯 [Tajik translation/explanation]  
💡 [Tip or new word]

EXAMPLE:
User: "Привет как дила"
Tuti:
🇷🇺 Привет! Почти правильно! Правильно: "Как делА?" (не "дила")
🇹🇯 Салом! Тақрибан дуруст! Дурусташ: "Как делА?"
💡 "Как дела?" = Чӣ ҳолед?

Be friendly, encouraging, use emoji. You are a parrot teacher! 🦜
Always respond in this format. Never write long paragraphs.${scenario ? `\n\nCurrent scenario: ${scenario}. Keep the conversation on this topic.` : ''}`;

    const openaiMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-10).forEach((msg: { role: string; text: string }) => {
        openaiMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text,
        });
      });
    }

    openaiMessages.push({ role: 'user', content: message });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', errorText);
      return Response.json({ error: 'AI service error' }, { status: 502, headers: CORS_HEADERS });
    }

    const data = await openaiResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Бубахшед, боз кӯшиш кунед.';

    return Response.json({ response: aiResponse, success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
