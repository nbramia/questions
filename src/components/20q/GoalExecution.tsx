'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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

interface GoalExecutionProps {
  session: SessionState;
}

interface ExecutionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function GoalExecution({ session }: GoalExecutionProps) {
  const [messages, setMessages] = useState<ExecutionMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with the goal context
  useEffect(() => {
    const initialMessage: ExecutionMessage = {
      id: 'goal-context',
      role: 'assistant',
      content: `I'm here to help you work on your goal. Based on the 20 Questions session, I understand that you want to:

**Goal:** ${session.goal}

**Context:** ${session.finalSummary || 'No additional context provided.'}

I'm ready to help you execute this goal. What would you like to start with?`,
      timestamp: new Date().toISOString()
    };
    setMessages([initialMessage]);
  }, [session]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: ExecutionMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/20q/execute-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          goal: session.goal,
          context: session.finalSummary,
          conversation: [...messages, userMessage],
          userMessage: input.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      const assistantMessage: ExecutionMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, session]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Goal Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Goal to Execute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">AI's Understanding</h3>
              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg">
                {session.goal}
              </p>
            </div>
            
            {session.finalSummary && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Context & Considerations</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {session.finalSummary}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Execution Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-4 flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading}
              className="flex-1 resize-none"
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="self-end"
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 