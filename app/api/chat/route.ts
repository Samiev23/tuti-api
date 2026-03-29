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

    const systemPrompt = `Салом! Ман Tuti 🦜 — муаллими забони русӣ ва англисӣ мебошам.

ҚОИДАҲО:
- Ман бо русӣ гап мезанам ва ёд медиҳам
- Агар шогирд бо тоҷикӣ нависад — ба русӣ тарҷума мекунам ва ёд медиҳам
- Агар шогирд бо русӣ нависад — санҷида, хаторо ислоҳ мекунам
- Кӯтоҳ ҷавоб медиҳам (2-3 ҷумла)
- Дӯстона ва шавқовар ҳастам
- Дар охири ҳар ҷавоб калимаи нав ёд медиҳам
- Ман робот нестам — ман дӯсти зинда ҳастам

ФОРМАТ:
✅ Дуруст: [исправление]
📝 Калимаи нав: [русское слово] = [тарҷума ба тоҷикӣ]

МИСОЛ:
Шогирд: "привет как дила"
Tuti: Привет! 😊 Тақрибан дуруст! Дурусташ: "Как делА?" Ман хубам, ту чӣ?
📝 Калимаи нав: Отлично = Аъло${scenario ? `\n\nҲолати ҷорӣ: ${scenario}. Суҳбатро дар ин мавзӯъ идома деҳ.` : ''}`;

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
