import { NextResponse } from 'next/server';

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

interface SummarizeGoalRequest {
  session: SessionState;
}

interface SummarizeGoalResponse {
  goal: string;
  summary: string;
}

export async function POST(req: Request) {
  try {
    const body: SummarizeGoalRequest = await req.json();
    const { session } = body;

    // Build the conversation history
    const turns = session.turns.map((turn, index) => 
      `Q${index + 1}: ${turn.question}\nA: ${turn.answer}`
    ).join('\n\n');

    // Create the prompt for goal summarization
    const prompt = `Based on the following conversation, I need you to:

1. Articulate a clear, actionable goal that summarizes what the user wants to accomplish
2. Provide a brief summary of the key context and constraints

Conversation:
${turns}

Please respond with JSON in this format:
{
  "goal": "A clear, concise statement of what needs to be accomplished",
  "summary": "Brief context about the situation, constraints, and key considerations"
}

The goal should be specific enough that another agent could work on it effectively.`;

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
            content: 'You are an AI assistant that creates clear, actionable goals based on conversation summaries. Always respond with valid JSON.'
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
        { error: 'Failed to generate goal summary' },
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
    let response: SummarizeGoalResponse;
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
    if (!response.goal || !response.summary) {
      return NextResponse.json(
        { error: 'Invalid response structure from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in summarize-goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 