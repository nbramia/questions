'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { QuestionCard } from '@/components/20q/QuestionCard';
import { SessionSummary } from '@/components/20q/SessionSummary';

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

export default function CompletedSessionPage({ params }: PageProps) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const { id } = await params;
        
        const response = await fetch(`/api/20q/session/${id}`, {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to load session');
        }
        
        const sessionData = await response.json();
        setSession(sessionData);
      } catch (err) {
        console.error('Error loading session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested session could not be loaded.'}</p>
          <a 
            href="/20q" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Start New Session
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Session Review
          </h1>
          <p className="text-gray-600">
            Completed on {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-6">
          {session.turns.map((turn, index) => (
            <QuestionCard
              key={index}
              turn={turn}
              turnIndex={index}
              isReadOnly={true}
              onSubmit={() => {}} // No-op for read-only
              isActive={false}
            />
          ))}
        </div>

        {session.status === 'completed' && (
          <div className="mt-8">
            <SessionSummary session={session} />
          </div>
        )}
      </div>
    </div>
  );
}
