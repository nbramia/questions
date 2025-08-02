'use client';

import { useState, useEffect, useCallback } from 'react';
import { QuestionCard } from '@/components/20q/QuestionCard';
import { SessionSummary } from '@/components/20q/SessionSummary';
import { Button } from '@/components/ui/button';

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
  const generateNextQuestion = useCallback(async (sessionData?: SessionState) => {
    if (loading) return;
    
    const currentSession = sessionData || session;
    
    // Check if we've reached the 20 question limit
    if (currentSession.turns.length >= 20) {
      console.log('Reached 20 question limit, completing session');
      setSession(prev => ({
        ...prev,
        status: 'completed',
        finalSummary: 'Session completed after 20 questions'
      }));
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/20q/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: currentSession,
          currentTurn: currentSession.turns.length
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate question');
      }

      const data = await response.json();
      
      // Check if confidence is high enough to complete the session
      if (data.confidence >= 0.9) {
        console.log('High confidence achieved, completing session');
        
        // Generate a proper goal summary using the AI
        try {
          const summaryResponse = await fetch('/api/20q/summarize-goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session: currentSession
            })
          });

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            setSession(prev => ({
              ...prev,
              status: 'completed',
              goalConfirmed: true,
              goal: summaryData.goal,
              finalSummary: summaryData.summary
            }));
          } else {
            // Fallback if summary generation fails
            setSession(prev => ({
              ...prev,
              status: 'completed',
              goalConfirmed: true,
              goal: 'Goal understanding achieved',
              finalSummary: 'Session completed with high confidence'
            }));
          }
        } catch (err) {
          console.error('Failed to generate goal summary:', err);
          setSession(prev => ({
            ...prev,
            status: 'completed',
            goalConfirmed: true,
            goal: 'Goal understanding achieved',
            finalSummary: 'Session completed with high confidence'
          }));
        }
      } else {
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
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [session, loading]);

  // Handle answer submission
  const handleAnswerSubmit = useCallback(async (turnIndex: number, answer: string) => {
    console.log('Submitting answer:', { turnIndex, answer });
    
    // Update the session state with the new answer
    const updatedSession = {
      ...session,
      turns: session.turns.map((turn, index) => 
        index === turnIndex ? { ...turn, answer } : turn
      )
    };
    
    console.log('Updated session:', updatedSession);
    setSession(updatedSession);

    // Check if we've reached the 20 question limit
    if (updatedSession.turns.length >= 20) {
      console.log('Reached 20 question limit, completing session');
      const completedSession = {
        ...updatedSession,
        status: 'completed' as const,
        finalSummary: 'Session completed after 20 questions'
      };
      setSession(completedSession);
      
      // Save the completed session to localStorage
      try {
        localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
        console.log('Completed session saved to localStorage:', completedSession.id);
      } catch (err) {
        console.error('Failed to save completed session to localStorage:', err);
      }
      return;
    }

    // Generate next question with the updated session data
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/20q/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: updatedSession,
          currentTurn: updatedSession.turns.length
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate question');
      }

      const data = await response.json();
      
      // Check if confidence is high enough to complete the session
      if (data.confidence >= 0.9) {
        console.log('High confidence achieved, completing session');
        
        // Generate a proper goal summary using the AI
        try {
          const summaryResponse = await fetch('/api/20q/summarize-goal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session: updatedSession
            })
          });

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            const completedSession = {
              ...updatedSession,
              status: 'completed' as const,
              goalConfirmed: true,
              goal: summaryData.goal,
              finalSummary: summaryData.summary
            };
            setSession(completedSession);
            
            // Save the completed session to localStorage
            try {
              localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
              console.log('Completed session saved to localStorage:', completedSession.id);
            } catch (err) {
              console.error('Failed to save completed session to localStorage:', err);
            }
          } else {
            // Fallback if summary generation fails
            const completedSession = {
              ...updatedSession,
              status: 'completed' as const,
              goalConfirmed: true,
              goal: 'Goal understanding achieved',
              finalSummary: 'Session completed with high confidence'
            };
            setSession(completedSession);
            
            // Save the completed session to localStorage
            try {
              localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
              console.log('Completed session saved to localStorage:', completedSession.id);
            } catch (err) {
              console.error('Failed to save completed session to localStorage:', err);
            }
          }
        } catch (err) {
          console.error('Failed to generate goal summary:', err);
          const completedSession = {
            ...updatedSession,
            status: 'completed' as const,
            goalConfirmed: true,
            goal: 'Goal understanding achieved',
            finalSummary: 'Session completed with high confidence'
          };
          setSession(completedSession);
          
          // Save the completed session to localStorage
          try {
            localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
            console.log('Completed session saved to localStorage:', completedSession.id);
          } catch (err) {
            console.error('Failed to save completed session to localStorage:', err);
          }
        }
      } else {
        // Add the new question turn
        setSession(prev => ({
          ...prev,
          turns: [...prev.turns, {
            question: data.question,
            answer: '',
            rationale: data.rationale,
            confidenceAfter: data.confidence,
            type: data.type
          }]
        }));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initialize with first question
  useEffect(() => {
    if (session.turns.length === 0) {
      generateNextQuestion();
    }
  }, [generateNextQuestion]);

  // Auto-save session to localStorage periodically
  useEffect(() => {
    if (session.turns.length > 0) {
      const saveSession = () => {
        try {
          localStorage.setItem(`20q-session-${session.id}`, JSON.stringify(session));
          console.log('Session saved to localStorage:', session.id);
        } catch (err) {
          console.error('Failed to save session to localStorage:', err);
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
          <div className="flex justify-between items-start mb-4">
            <div>
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
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/20q/conversations">View Conversations</a>
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{session.turns.length} / 20 questions</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(session.turns.length / 20) * 100}%` }}
              />
            </div>
          </div>
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

        {!loading && session.turns.length > 0 && (
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              onClick={async () => {
                setLoading(true);
                try {
                  // Generate a proper goal summary using the AI
                  const summaryResponse = await fetch('/api/20q/summarize-goal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      session
                    })
                  });

                  if (summaryResponse.ok) {
                    const summaryData = await summaryResponse.json();
                    const completedSession = {
                      ...session,
                      status: 'completed' as const,
                      goalConfirmed: true,
                      goal: summaryData.goal,
                      finalSummary: summaryData.summary
                    };
                    setSession(completedSession);
                    
                    // Save the completed session to localStorage
                    try {
                      localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
                      console.log('Completed session saved to localStorage:', completedSession.id);
                    } catch (err) {
                      console.error('Failed to save completed session to localStorage:', err);
                    }
                  } else {
                    // Fallback if summary generation fails
                    const completedSession = {
                      ...session,
                      status: 'completed' as const,
                      goalConfirmed: true,
                      goal: 'Goal understanding achieved',
                      finalSummary: 'Session completed early by user'
                    };
                    setSession(completedSession);
                    
                    // Save the completed session to localStorage
                    try {
                      localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
                      console.log('Completed session saved to localStorage:', completedSession.id);
                    } catch (err) {
                      console.error('Failed to save completed session to localStorage:', err);
                    }
                  }
                } catch (err) {
                  console.error('Failed to generate goal summary:', err);
                  const completedSession = {
                    ...session,
                    status: 'completed' as const,
                    goalConfirmed: true,
                    goal: 'Goal understanding achieved',
                    finalSummary: 'Session completed early by user'
                  };
                  setSession(completedSession);
                  
                  // Save the completed session to localStorage
                  try {
                    localStorage.setItem(`20q-session-${completedSession.id}`, JSON.stringify(completedSession));
                    console.log('Completed session saved to localStorage:', completedSession.id);
                  } catch (err) {
                    console.error('Failed to save completed session to localStorage:', err);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              I&apos;m satisfied with my goal - Stop Early
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
