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
  savedAt?: string;
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: Request, { params }: PageProps) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('Fetching session from localStorage:', id);

    // For localStorage approach, we return a message indicating the session should be loaded from browser storage
    return NextResponse.json({ 
      message: 'Session should be loaded from localStorage',
      sessionId: id,
      localStorageKey: `20q-session-${id}`
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 