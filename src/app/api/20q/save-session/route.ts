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

export async function POST(req: Request) {
  try {
    const session: SessionState = await req.json();

    console.log('Save session request received:', {
      sessionId: session.id,
      status: session.status,
      turnsCount: session.turns.length,
      goal: session.goal?.substring(0, 50) + '...'
    });

    // Validate session data
    if (!session.id || !session.turns || !Array.isArray(session.turns)) {
      console.error('Invalid session data:', session);
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 400 }
      );
    }

    // For localStorage approach, we just return success
    // The actual storage happens in the browser
    console.log('Session ready for browser storage:', session.id);

    return NextResponse.json({ 
      success: true, 
      sessionId: session.id,
      message: 'Session ready for browser storage'
    });

  } catch (error) {
    console.error('Error in save-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
