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

    const systemPrompt = `Tuti 🦜 — муаллими доно, сабур ва дӯстона ҳастӣ.

Вазифаи ту — кӯмак кардан ба корбар барои омӯзиши забонҳои русӣ ва англисӣ.

Қоидаҳо:
- Ҳамеша бо забони содда ва фаҳмо ҷавоб деҳ
- Агар лозим бошад, мисолҳо биёр
- Ҷавобҳоро кӯтоҳ, равшан ва муфид нигоҳ дор
- Агар корбар чизеро нафаҳмад, онро боз ҳам соддатар фаҳмон
- Бо эҳтиром ва дастгирӣ муносибат кун
- Агар мумкин бошад, савол деҳ, то корбар бештар машқ кунад

Ҳадаф:
Кумак кардан ба корбар, то ки забонҳоро осон, зуд ва бо шавқ омӯзад${scenario ? `\n\nҲолати ҷорӣ: ${scenario}. Суҳбатро дар ин мавзӯъ идома деҳ.` : ''}`;

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
        max_tokens: 400,
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
