import { NextResponse } from 'next/server';
import { getUpcomingEvents, formatCalendarForPrompt } from '@/lib/20q/calendar';
import { buildCalendarPrompt } from '@/lib/20q/prompts';
import { sendTelegramMessage } from '@/lib/20q/telegram';

interface NudgeRequest {
  goal: string;
  sessionId?: string;
  customMessage?: string;
}

interface NudgeDecision {
  shouldNudge: boolean;
  reason: string;
  timing: string;
  message: string;
}

export async function POST(req: Request) {
  try {
    const body: NudgeRequest = await req.json();
    const { goal, sessionId, customMessage } = body;

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal is required' },
        { status: 400 }
      );
    }

    // Get upcoming calendar events
    const events = await getUpcomingEvents(3); // Next 3 days
    const calendarText = formatCalendarForPrompt(events);

    // Build prompt for LLM decision
    const prompt = buildCalendarPrompt(goal, calendarText);

    // Call OpenAI to decide if we should nudge
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an AI assistant that analyzes calendar events to determine if and when to send helpful nudges about 20 Questions goals. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      return NextResponse.json(
        { error: 'Failed to analyze calendar' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the decision
    let decision: NudgeDecision;
    try {
      decision = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    // Validate decision structure
    if (typeof decision.shouldNudge !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid decision structure from AI' },
        { status: 500 }
      );
    }

    // If AI says we should nudge, send the notification
    if (decision.shouldNudge) {
      const message = customMessage || decision.message || 
        `🤔 20 Questions Reminder\n\nGoal: ${goal}\n\nReady to continue? https://ramia.us/20q`;

      const success = await sendTelegramMessage(message);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to send notification' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      decision,
      events: events.length
    });

  } catch (error) {
    console.error('Error in schedule-nudge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
