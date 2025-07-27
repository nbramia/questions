// ============================
// src/lib/20q/summarizer.ts
// ============================

import { buildSummaryPrompt } from './prompts';

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

export async function generateSummary(session: SessionState): Promise<string> {
  try {
    // Build the summary prompt
    const prompt = buildSummaryPrompt(session);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that creates concise, insightful summaries of 20 Questions sessions. Focus on key insights and actionable takeaways.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    return summary.trim();

  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

export async function summarizeSession(session: SessionState) {
  try {
    const summary = await generateSummary(session);
    
    return {
      summary,
      diff: "" // TODO: Implement diff detection if needed
    };
  } catch (error) {
    console.error('Error in summarizeSession:', error);
    return {
      summary: "Failed to generate summary",
      diff: ""
    };
  }
}
