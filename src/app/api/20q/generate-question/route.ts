import { NextResponse } from 'next/server';
import { buildPrompt } from '@/lib/20q/prompts';

interface QuestionTurn {
  question: string;
  answer: string;
  rationale?: string;
  confidenceAfter?: number;
  type: 'text' | 'likert' | 'choice';
}

interface SessionState {
  id: string;
  createdAt: string;
  goal: string;
  goalConfirmed: boolean;
  turns: QuestionTurn[];
  finalSummary?: string;
  status: 'in-progress' | 'completed';
  userStopped?: boolean;
}

interface GenerateQuestionRequest {
  session: SessionState;
  currentTurn: number;
}

interface GenerateQuestionResponse {
  question: string;
  rationale: string;
  confidence: number;
  type: 'text' | 'likert' | 'choice';
}

export async function POST(req: Request) {
  try {
    const body: GenerateQuestionRequest = await req.json();
    const { session, currentTurn } = body;

    // Validate request
    if (!session || typeof currentTurn !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Build the prompt for the LLM
    const prompt = buildPrompt(session, currentTurn);

    // Call OpenAI API
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
            content: 'You are an intelligent agent conducting a 20 Questions session. Your goal is to ask the most relevant question to understand the user\'s goal or problem. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to generate question' },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from OpenAI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let response: GenerateQuestionResponse;
    try {
      response = JSON.parse(content);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!response.question || !response.rationale || typeof response.confidence !== 'number' || !response.type) {
      return NextResponse.json(
        { error: 'Invalid response structure from AI' },
        { status: 500 }
      );
    }

    // Ensure confidence is between 0 and 1
    response.confidence = Math.max(0, Math.min(1, response.confidence));

    // Ensure type is valid
    if (!['text', 'likert', 'choice'].includes(response.type)) {
      response.type = 'text';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in generate-question:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
