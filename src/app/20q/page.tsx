'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function TwentyQuestionsPage() {
  const [session, setSession] = useState<SessionState>({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    goal: '',
    goalConfirmed: false,
    turns: [],
    status: 'in-progress'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next question from agent
  const generateNextQuestion = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/20q/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session,
          currentTurn: session.turns.length
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate question');
      }

      const data = await response.json();
      
      // Add the new question turn
      setSession(prev => ({
        ...prev,
        turns: [...prev.turns, {
          question: data.question,
          answer: '',
          rationale: data.rationale,
          type: data.type
        }]
      }));

      // If goal is confirmed, save session
      if (data.confidence > 0.8 && !session.goalConfirmed) {
        setSession(prev => ({
          ...prev,
          goalConfirmed: true,
          goal: prev.turns.map(t => t.answer).join(' ')
        }));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  // Handle answer submission
  const handleAnswerSubmit = useCallback(async (turnIndex: number, answer: string) => {
    setSession(prev => ({
      ...prev,
      turns: prev.turns.map((turn, index) => 
        index === turnIndex ? { ...turn, answer } : turn
      )
    }));

    // Generate next question after a short delay
    setTimeout(() => {
      generateNextQuestion();
    }, 500);
  }, [generateNextQuestion]);

  // Initialize with first question
  useEffect(() => {
    if (session.turns.length === 0) {
      generateNextQuestion();
    }
  }, [generateNextQuestion]);

  // Auto-save session periodically
  useEffect(() => {
    if (session.turns.length > 0) {
      const saveSession = async () => {
        try {
          await fetch('/api/20q/save-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session)
          });
        } catch (err) {
          console.error('Failed to save session:', err);
        }
      };

      const interval = setInterval(saveSession, 30000); // Save every 30 seconds
      return () => clearInterval(interval);
    }
  }, [session]);

  if (session.status === 'completed') {
    return <SessionSummary session={session} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            20 Questions
          </h1>
          <p className="text-gray-600">
            {session.goalConfirmed 
              ? `Goal: ${session.goal}`
              : 'Let\'s understand your goal through a series of questions.'
            }
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {session.turns.map((turn, index) => (
            <QuestionCard
              key={index}
              turn={turn}
              turnIndex={index}
              isReadOnly={index < session.turns.length - 1}
              onSubmit={(answer) => handleAnswerSubmit(index, answer)}
              isActive={index === session.turns.length - 1}
            />
          ))}
        </div>

        {loading && (
          <div className="mt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Generating next question...</p>
          </div>
        )}
      </div>
    </div>
  );
}
