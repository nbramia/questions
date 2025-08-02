import { NextResponse } from 'next/server';

interface ExecutionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ExecuteGoalRequest {
  sessionId: string;
  goal: string;
  context?: string;
  conversation: ExecutionMessage[];
  userMessage: string;
}

// interface ExecuteGoalResponse {
//   response: string;
// }

export async function POST(req: Request) {
  try {
    const body: ExecuteGoalRequest = await req.json();
    const { sessionId, goal, context, conversation, userMessage } = body;

    // Validate request
    if (!sessionId || !goal || !userMessage) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Build the conversation history for the AI
    const conversationHistory = conversation
      .filter(msg => msg.id !== 'goal-context') // Exclude the initial context message
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Create the prompt for goal execution
    const prompt = `You are an AI agent working to execute a specific goal that was established through a 20 Questions session.

GOAL TO EXECUTE:
${goal}

CONTEXT FROM 20Q SESSION:
${context || 'No additional context provided.'}

CONVERSATION HISTORY:
${conversationHistory}

USER'S LATEST MESSAGE:
${userMessage}

INSTRUCTIONS:
- You are now in the EXECUTION phase - the goal has been established and you need to work on it
- Be proactive and helpful in advancing toward the goal
- Ask clarifying questions if needed
- Do one thing at a time. Don't try to inject multiple different actions, questions, or suggestions into a single response. This is like a text message thread where you should be really concise
- Be encouraging and supportive
- Focus on making progress toward the goal; always bring it back to the next thing that will help you make the most progress toward that goal.
- No message should be longer than three sentences. Keep it extremely short. Never ask multiple questions in a single message.
- In the first message, you can jump right in. You don't need to set any context because the context is already going to be given elsewhere. Just send the first message with the first prompt or question necessary to move the conversation toward the goal.
- If you need to contact someone or schedule something, mention that you can send a Telegram notification
`;

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
            content: 'You are an AI agent that helps execute goals established through 20 Questions sessions. Be proactive, helpful, and focused on making progress toward the goal. This is conversational, like a text message thread. Keep your questions and responses very concise and short. No message should be longer than three sentences. Keep it extremely short. Never ask multiple questions in a single message.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
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

    return NextResponse.json({
      response: content
    });

  } catch (error) {
    console.error('Error in execute-goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 