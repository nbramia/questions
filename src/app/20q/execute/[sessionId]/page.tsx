'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GoalExecution } from '@/components/20q/GoalExecution';

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
    sessionId: string;
  }>;
}

export default function GoalExecutionPage({ params }: PageProps) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const { sessionId: id } = await params;
        setSessionId(id);
        
        // Load session from localStorage
        const sessionData = localStorage.getItem(`20q-session-${id}`);
        if (!sessionData) {
          setError('Session not found in browser storage');
          setLoading(false);
          return;
        }
        
        const session = JSON.parse(sessionData);
        setSession(session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading goal execution session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error || 'Session not found'}</p>
            <Button 
              onClick={() => window.history.back()} 
              className="mt-4"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (session.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-orange-600 mb-4">Session Not Ready</h1>
            <p className="text-gray-600">This session is not yet completed and ready for execution.</p>
            <Button 
              onClick={() => window.history.back()} 
              className="mt-4"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Goal Execution
          </h1>
          <p className="text-gray-600">
            Working on the established goal from the 20 Questions session.
          </p>
        </div>

        <GoalExecution session={session} />
      </div>
    </div>
  );
} 