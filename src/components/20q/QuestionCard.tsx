'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhyThisQuestion } from './WhyThisQuestion';

interface QuestionTurn {
  question: string;
  answer: string;
  rationale?: string;
  confidenceAfter?: number;
  type: 'text' | 'likert' | 'choice';
}

interface QuestionCardProps {
  turn: QuestionTurn;
  turnIndex: number;
  isReadOnly: boolean;
  onSubmit: (answer: string) => void;
  isActive: boolean;
}

export function QuestionCard({ turn, turnIndex, isReadOnly, onSubmit, isActive }: QuestionCardProps) {
  const [answer, setAnswer] = useState(turn.answer);
  const [showRationale, setShowRationale] = useState(false);

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderInput = () => {
    switch (turn.type) {
      case 'text':
        return (
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer..."
            disabled={isReadOnly}
            className="min-h-[100px] resize-none"
            autoFocus={isActive}
          />
        );

      case 'likert':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-600">Strongly Disagree</Label>
              <Label className="text-sm text-gray-600">Strongly Agree</Label>
            </div>
            <div className="flex items-center justify-between space-x-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={answer === value.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnswer(value.toString())}
                  disabled={isReadOnly}
                  className="flex-1"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'choice':
        return (
          <div className="space-y-2">
            {['Yes', 'No', 'Maybe'].map((choice) => (
              <Button
                key={choice}
                variant={answer === choice ? "default" : "outline"}
                onClick={() => setAnswer(choice)}
                disabled={isReadOnly}
                className="w-full justify-start"
              >
                {choice}
              </Button>
            ))}
          </div>
        );

      default:
        return (
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer..."
            disabled={isReadOnly}
            autoFocus={isActive}
          />
        );
    }
  };

  return (
    <Card className={`transition-all duration-200 ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-medium text-gray-900">
              Question {turnIndex + 1}
            </CardTitle>
            <p className="mt-2 text-gray-700">{turn.question}</p>
          </div>
          {turn.rationale && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRationale(!showRationale)}
              className="ml-4"
            >
              Why this question?
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showRationale && turn.rationale && (
          <WhyThisQuestion rationale={turn.rationale} />
        )}

        <div className="space-y-4">
          {renderInput()}

          {isActive && !isReadOnly && (
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!answer.trim()}
                className="px-6"
              >
                Submit
              </Button>
            </div>
          )}
        </div>

        {!isActive && turn.answer && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Your answer:</p>
            <p className="text-gray-900">{turn.answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
