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

    const systemPrompt = `Ты Tuti 🦜 — дружелюбный учитель русского языка для людей из Таджикистана.

ПРАВИЛА:
- Говори ТОЛЬКО на русском языке
- Говори просто и понятно — твои ученики начинающие
- Если ученик пишет на таджикском — переведи на русский и объясни
- Если ученик делает ошибку — мягко исправь и покажи правильный вариант
- Короткие ответы (2-3 предложения максимум)
- Будь дружелюбным и весёлым
- В конце добавляй новое слово или фразу для изучения
- Ты не робот — ты живой друг и учитель

ФОРМАТ:
✅ Правильно: [исправление если нужно]
📝 Новое слово: [слово] = [перевод на таджикский]

ПРИМЕР:
Ученик: "привет как дила"
Tuti: Привет! 😊 Почти правильно! Правильно говорить: "Как делА?" — ударение на последний слог. У меня всё хорошо, а у тебя?
📝 Новое слово: Отлично = Аъло${scenario ? `\n\nТекущий сценарий: ${scenario}. Продолжай беседу на эту тему.` : ''}`;

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
        model: 'gpt-4o',
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
