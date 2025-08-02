import { NextResponse } from 'next/server';
import { writeSessionToDrive } from '@/lib/storage/drive';
import { generateSummary } from '@/lib/20q/summarizer';
import fs from 'fs';
import path from 'path';

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

    // Try Google Drive first
    let driveSuccess = false;
    try {
      const result = await writeSessionToDrive(sessionData);
      console.log('Google Drive save result:', result);
      
      if (result) {
        driveSuccess = true;
        console.log('Session saved successfully to Google Drive:', session.id);
      } else {
        console.error('Failed to save to Google Drive - writeSessionToDrive returned false');
      }
    } catch (error) {
      console.error('Failed to save to Google Drive:', error);
    }

    // Fallback: Save locally if Google Drive fails
    if (!driveSuccess) {
      console.log('Google Drive failed, saving locally as fallback');
      try {
        // Create sessions directory if it doesn't exist
        const sessionsDir = path.join(process.cwd(), 'sessions');
        if (!fs.existsSync(sessionsDir)) {
          fs.mkdirSync(sessionsDir, { recursive: true });
        }
        
        // Save JSON file
        const jsonPath = path.join(sessionsDir, `20q-session-${session.id}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(sessionData, null, 2));
        
        // Save summary file
        if (summary) {
          const summaryPath = path.join(sessionsDir, `20q-session-${session.id}-summary.txt`);
          const summaryContent = `20 Questions Session Summary\n\n` +
            `Session ID: ${session.id}\n` +
            `Created: ${session.createdAt}\n` +
            `Goal: ${session.goal}\n\n` +
            `Summary:\n${summary}\n\n` +
            `Questions & Answers:\n` +
            session.turns.map((turn, index) => 
              `${index + 1}. Q: ${turn.question}\n   A: ${turn.answer}`
            ).join('\n\n');
          
          fs.writeFileSync(summaryPath, summaryContent);
        }
        
        console.log('Session saved locally as fallback:', session.id);
      } catch (localError) {
        console.error('Failed to save locally:', localError);
        return NextResponse.json(
          { error: 'Failed to save session (both Google Drive and local fallback failed)' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      sessionId: session.id,
      summary,
      savedToDrive: driveSuccess,
      savedLocally: !driveSuccess
    });

  } catch (error) {
    console.error('Error in save-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
