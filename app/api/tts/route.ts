import type { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.length > 500) {
      return Response.json({ error: 'Invalid text' }, { status: 400, headers: CORS_HEADERS });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return Response.json({ error: 'Server config error' }, { status: 500, headers: CORS_HEADERS });
    }

    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'cove',
        input: text,
        response_format: 'mp3',
        speed: 0.9,
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('OpenAI TTS error:', errorText);
      return Response.json({ error: 'TTS error' }, { status: 502, headers: CORS_HEADERS });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS_HEADERS });
  }
}
