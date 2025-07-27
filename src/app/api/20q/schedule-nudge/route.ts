import { NextResponse } from 'next/server';
import { getUpcomingEvents, formatCalendarForPrompt } from '@/lib/20q/calendar';
import { buildCalendarPrompt } from '@/lib/20q/prompts';
import { sendTelegramMessage } from '@/lib/20q/telegram';
import { determineAccountContext } from '@/lib/storage/drive';

interface QuestionTurn {
  question: string;
  answer: string;
  rationale?: string;
  confidenceAfter?: number;
  type: 'text' | 'likert' | 'choice';
}

interface SessionData {
  id: string;
  createdAt: string;
  goal: string;
  goalConfirmed: boolean;
  turns: QuestionTurn[];
  finalSummary?: string;
  status: 'in-progress' | 'completed';
  userStopped?: boolean;
  savedAt: string;
  accountContext?: 'personal' | 'work';
}

interface NudgeRequest {
  goal: string;
  sessionId?: string;
  customMessage?: string;
  sessionData?: {
    goal: string;
    turns?: Array<{ answer: string }>;
    accountContext?: 'personal' | 'work';
  };
}

interface NudgeDecision {
  shouldNudge: boolean;
  reason: string;
  timing: string;
  message: string;
  accountContext?: 'personal' | 'work';
}

export async function POST(req: Request) {
  try {
    const body: NudgeRequest = await req.json();
    const { goal, customMessage, sessionData } = body;

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal is required' },
        { status: 400 }
      );
    }

    // Get upcoming calendar events from BOTH accounts overlaid
    // This gives the AI the full picture for optimal timing decisions
    const allEvents = await getUpcomingEvents(3); // This gets both personal and work events
    const calendarText = formatCalendarForPrompt(allEvents);

    // Determine which account context the session belongs to for storage/notification purposes
    let accountContext: 'personal' | 'work' = 'personal';
    if (sessionData) {
      // Create a proper session object that matches the expected interface
      const fullSessionData: SessionData = {
        id: 'temp',
        createdAt: new Date().toISOString(),
        goal: sessionData.goal,
        goalConfirmed: false,
        turns: (sessionData.turns || []).map(turn => ({
          question: 'Previous question',
          answer: turn.answer,
          type: 'text' as const
        })),
        status: 'in-progress',
        userStopped: false,
        savedAt: new Date().toISOString(),
        accountContext: sessionData.accountContext
      };
      accountContext = determineAccountContext(fullSessionData);
    }

    // Build prompt for LLM decision with full calendar view
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
            content: 'You are an AI assistant that analyzes calendar events from both personal and work calendars to determine if and when to send helpful nudges about 20 Questions goals. You can see the full schedule across both contexts to find optimal timing. Always respond with valid JSON.'
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
    } catch {
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

    // Add account context to decision
    decision.accountContext = accountContext;

    // If AI says we should nudge, send the notification
    if (decision.shouldNudge) {
      const contextPrefix = accountContext === 'work' ? '[Work] ' : '[Personal] ';
      const message = customMessage || decision.message || 
        `${contextPrefix}🤔 20 Questions Reminder\n\nGoal: ${goal}\n\nReady to continue? https://ramia.us/20q`;

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
      events: allEvents.length,
      accountContext,
      calendarContext: 'both' // Indicate that both calendars were analyzed
    });

  } catch (error) {
    console.error('Error in schedule-nudge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
