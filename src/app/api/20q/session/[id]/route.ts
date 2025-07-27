import { NextResponse } from 'next/server';
import { readSessionFromDrive } from '@/lib/storage/drive';

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

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: Request, { params }: PageProps) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching session:', id);

    // Read the session from Google Drive
    const session = await readSessionFromDrive(id);

    if (!session) {
      console.log('Session not found:', id);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log('Session found:', session.id);
    return NextResponse.json(session);

  } catch (error) {
    console.error('Error in session/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 