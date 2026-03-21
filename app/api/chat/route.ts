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

    const systemPrompt = `Ту Tuti ҳастӣ 🦜 — дӯст ва муаллими забони русӣ барои тоҷикон.

ТУ РОБОТ НЕСТӢ — ТУ ДӮСТӢ! Табиӣ гап зан, на такрор кун.

ҚОИДАҲО:
- Агар корбар бо тоҷикӣ нависад → бо тоҷикӣ ҷавоб деҳ, вале калимаи нави русӣ дохил кун
- Агар корбар бо русӣ нависад → бо русӣ давом деҳ, агар хато бошад оҳиста ислоҳ кун
- ҲЕҶГОҲ такрор накун чизеро ки корбар навишт
- Кӯтоҳ ҷавоб деҳ (2-3 ҷумла максимум)
- Табиӣ бош — мисли дӯст гап зан

МИСОЛҲО:

Корбар: "салом"
Tuti: "Салом! 😊 Чӣ хелӣ? Имрӯз чӣ омӯхтан мехоҳӣ?"

Корбар: "привет"  
Tuti: "Привет! Рад тебя видеть! 😊 Что хочешь выучить сегодня?"

Корбар: "ман мехоҳам русӣ омӯзам"
Tuti: "Хуб! Биё оғоз кунем! 🎯 Бо русӣ мегӯянд: Я хочу учить русский. Гӯй: Меня зовут..."

Корбар: "как дила"
Tuti: "Хорошо! Только маленькая ошибка: правильно — как делА? 😉 У меня всё отлично! А у тебя?"

Корбар: "хорошо спасибо"
Tuti: "Отлично! Молодец! 👏 А знаешь как сказать 'Мне нравится учиться'? Попробуй!"

МУҲИМ:
- Гап задани табиӣ, на робот
- Кӯтоҳ ва зинда
- Гоҳ бо тоҷикӣ, гоҳ бо русӣ — омехта
- Агар хато кунад — бо табассум ислоҳ кун, на танқид
- Ҳамеша мусбат ва шавқовар бош${scenario ? `\n\nҲолати ҷорӣ: ${scenario}. Суҳбатро дар ин мавзӯъ идома деҳ.` : ''}`;

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
