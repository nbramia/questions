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

    // Generate summary if session is completed
    let summary = session.finalSummary;
    if (session.status === 'completed' && !summary) {
      try {
        console.log('Generating summary for completed session');
        summary = await generateSummary(session);
        console.log('Summary generated:', summary?.substring(0, 100) + '...');
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

    console.log('Attempting to save session to Google Drive:', session.id);

    // Save to Google Drive
    try {
      const result = await writeSessionToDrive(sessionData);
      console.log('Google Drive save result:', result);
      
      if (!result) {
        console.error('Failed to save to Google Drive - writeSessionToDrive returned false');
        return NextResponse.json(
          { error: 'Failed to save session to Google Drive' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Failed to save to Google Drive:', error);
      return NextResponse.json(
        { error: 'Failed to save session' },
        { status: 500 }
      );
    }

    console.log('Session saved successfully:', session.id);

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
