import { NextResponse } from 'next/server';
import { readSessionFromDrive } from '@/lib/storage/drive';
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

    console.log('Fetching session:', id);

    // Try Google Drive first
    let session = await readSessionFromDrive(id);
    
    // If not found in Google Drive, try local storage
    if (!session) {
      console.log('Session not found in Google Drive, checking local storage');
      try {
        const sessionsDir = path.join(process.cwd(), 'sessions');
        const jsonPath = path.join(sessionsDir, `20q-session-${id}.json`);
        
        if (fs.existsSync(jsonPath)) {
          const fileContent = fs.readFileSync(jsonPath, 'utf-8');
          const sessionData = JSON.parse(fileContent) as SessionState;
          // Ensure savedAt is present
          session = {
            ...sessionData,
            savedAt: sessionData.savedAt || new Date().toISOString()
          };
          console.log('Session found in local storage:', id);
        }
      } catch (localError) {
        console.error('Error reading from local storage:', localError);
      }
    }

    if (!session) {
      console.log('Session not found:', id);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('Session found:', session.id);
    return NextResponse.json(session);

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 