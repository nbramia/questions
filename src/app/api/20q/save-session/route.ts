import { NextResponse } from 'next/server';
import { writeSessionToDrive } from '@/lib/storage/drive';
import { generateSummary } from '@/lib/20q/summarizer';

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

    // Validate session data
    if (!session.id || !session.turns || !Array.isArray(session.turns)) {
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 400 }
      );
    }

    // Generate summary if session is completed
    let summary = session.finalSummary;
    if (session.status === 'completed' && !summary) {
      try {
        summary = await generateSummary(session);
      } catch (error) {
        console.error('Failed to generate summary:', error);
        summary = 'Summary generation failed';
      }
    }

    // Prepare session data for storage
    const sessionData = {
      ...session,
      finalSummary: summary,
      savedAt: new Date().toISOString()
    };

    // Save to Google Drive
    try {
      await writeSessionToDrive(sessionData);
    } catch (error) {
      console.error('Failed to save to Google Drive:', error);
      return NextResponse.json(
        { error: 'Failed to save session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      sessionId: session.id,
      summary 
    });

  } catch (error) {
    console.error('Error in save-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
