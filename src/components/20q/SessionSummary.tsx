'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface SessionSummaryProps {
  session: SessionState;
}

export function SessionSummary({ session }: SessionSummaryProps) {
  const averageConfidence = session.turns
    .filter(turn => turn.confidenceAfter !== undefined)
    .reduce((sum, turn) => sum + (turn.confidenceAfter || 0), 0) / 
    session.turns.filter(turn => turn.confidenceAfter !== undefined).length;

  const handleStartExecution = () => {
    // Navigate to the goal execution page
    window.location.href = `/20q/execute/${session.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Goal Understanding Complete
          </h1>
          <p className="text-gray-600">
            We've successfully captured your goal. You can now proceed to the execution phase.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Confirmed Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">AI's Understanding of Your Goal</h3>
                <p className="text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  {session.goal || 'No goal defined'}
                </p>
              </div>
              
              {session.finalSummary && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Context & Considerations</h3>
                  <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                    {session.finalSummary}
                  </p>
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Confidence Level</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(averageConfidence || 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round((averageConfidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleStartExecution}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Start Goal Execution
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  An AI agent will now work on achieving your goal
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Questions & Answers */}
          <Card>
            <CardHeader>
              <CardTitle>Questions & Answers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {session.turns.map((turn, index) => (
                  <div key={index} className="border-l-4 border-blue-200 pl-4">
                    <h4 className="font-medium text-gray-900 mb-1">
                      Q{index + 1}: {turn.question}
                    </h4>
                    <p className="text-gray-700 text-sm">
                      A: {turn.answer}
                    </p>
                    {turn.confidenceAfter && (
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {Math.round(turn.confidenceAfter * 100)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <Button
            onClick={() => window.location.href = '/20q'}
            variant="outline"
          >
            Start New Session
          </Button>
          <Button
            onClick={() => window.location.href = `/20q/session/${session.id}`}
          >
            View Full Session
          </Button>
        </div>
      </div>
    </div>
  );
}
