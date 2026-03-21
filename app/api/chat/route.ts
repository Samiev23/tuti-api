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

    const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
    const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;

    if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) {
      return Response.json({ error: 'Server configuration error' }, { status: 500, headers: CORS_HEADERS });
    }

    const systemPrompt = `Ту Tuti ҳастӣ — муаллими забони русӣ барои тоҷикон. 

Қоидаҳои ту:
1. Ту бо забони тоҷикӣ ва русӣ гап мезанӣ
2. Ту ба корбар кӯмак мекунӣ, ки русӣ гап занад
3. Агар корбар хато кунад — боадабона ислоҳ кун ва дуруст нишон деҳ
4. Ҷавобҳои кӯтоҳ деҳ (2-3 ҷумла максимум)
5. Баъди ислоҳ, мисоли дуруст нишон деҳ
6. Гоҳ-гоҳ калимаи нав ёд деҳ
7. Дӯстона ва шавқовар бош — ту тӯтӣ ҳастӣ! 🦜
8. Агар корбар бо тоҷикӣ нависад — ба русӣ тарҷума кун ва ёд деҳ
9. Агар корбар бо русӣ нависад — санҷида, ислоҳ кун ва офарин гӯй

${scenario ? `Ҳолати ҷорӣ: ${scenario}. Суҳбатро дар ин мавзӯъ идома деҳ.` : ''}

Ҳамеша кӯтоҳ ва фаҳмо ҷавоб деҳ.`;

    const messages: { role: string; text: string }[] = [
      { role: 'system', text: systemPrompt },
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-10).forEach((msg: { role: string; text: string }) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          text: msg.text,
        });
      });
    }

    messages.push({ role: 'user', text: message });

    const yandexResponse = await fetch(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${YANDEX_API_KEY}`,
          'x-folder-id': YANDEX_FOLDER_ID,
        },
        body: JSON.stringify({
          modelUri: `gpt://${YANDEX_FOLDER_ID}/yandexgpt-lite`,
          completionOptions: {
            stream: false,
            temperature: 0.7,
            maxTokens: 200,
          },
          messages,
        }),
      }
    );

    if (!yandexResponse.ok) {
      const errorText = await yandexResponse.text();
      console.error('YandexGPT error:', errorText);
      return Response.json({ error: 'AI service error' }, { status: 502, headers: CORS_HEADERS });
    }

    const data = await yandexResponse.json();
    const aiResponse =
      data.result?.alternatives?.[0]?.message?.text ||
      'Бубахшед, ман фаҳмида натавонистам. Боз як бор гӯед?';

    return Response.json({ response: aiResponse, success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}
