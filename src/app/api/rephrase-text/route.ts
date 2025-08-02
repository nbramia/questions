import { NextResponse } from 'next/server';

interface RephraseRequest {
  text: string;
}

interface RephraseResponse {
  rephrasedText: string;
}

export async function POST(req: Request) {
  try {
    const body: RephraseRequest = await req.json();
    const { text } = body;

    // Validate request
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body - text is required' },
        { status: 400 }
      );
    }

    // Call OpenAI API to rephrase the text in Paul Graham's style
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a text rephrasing assistant that helps anonymize writing styles. Your task is to rephrase the given text in the clear, simple, and direct writing style of Paul Graham.

Paul Graham's writing style characteristics:
- Clear and straightforward sentences
- Maintains the original meaning and intent
- Maintains the sense of emotion or urgency, if that's present
- Removes personal writing quirks, typos, and distinctive phrasing
- Preserves the core message while making it more anonymous

Your response should be ONLY the rephrased text, nothing else.`
          },
          {
            role: 'user',
            content: `Please rephrase this text in Paul Graham's clear, direct style while preserving the original meaning: "${text}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to rephrase text' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const rephrasedText = openaiData.choices[0]?.message?.content;

    if (!rephrasedText) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rephrasedText: rephrasedText.trim()
    });

  } catch (error) {
    console.error('Error in rephrase-text:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 