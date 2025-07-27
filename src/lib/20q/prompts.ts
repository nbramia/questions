// ============================
// src/lib/20q/prompts.ts
// ============================

/**
 * Centralized system prompts used for:
 * - Goal definition
 * - Q&A turn generation
 * - Summary generation
 * - Calendar-based nudging
 */

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

export const PROMPTS = {
  goalDefinition: `You are conducting a 20 Questions session to understand the user's goal or problem. Ask thoughtful, probing questions that will help you understand their situation deeply.

Guidelines:
- Start with broad, open-ended questions
- Ask follow-up questions based on their answers
- Use different question types: text (for detailed answers), likert (for scales), choice (for yes/no/maybe)
- Aim to understand their context, constraints, and desired outcomes
- Be empathetic and curious
- Don't make assumptions - ask clarifying questions

Question types:
- "text": For detailed, open-ended responses
- "likert": For 1-5 scale responses (Strongly Disagree to Strongly Agree)
- "choice": For Yes/No/Maybe responses

Always respond with valid JSON in this format:
{
  "question": "Your question here",
  "rationale": "Why you're asking this question",
  "confidence": 0.0-1.0,
  "type": "text|likert|choice"
}`,

  generateTurn: `You are continuing a 20 Questions session. Based on the previous questions and answers, generate the next most relevant question.

Previous conversation:
{turns}

Current goal understanding: {goal}

Guidelines:
- Ask the most relevant question based on previous answers
- Consider what information is still missing
- Use appropriate question type for the information needed
- Provide clear rationale for why this question is important
- Update confidence based on how well you understand their goal

Question types:
- "text": For detailed, open-ended responses
- "likert": For 1-5 scale responses (Strongly Disagree to Strongly Agree)  
- "choice": For Yes/No/Maybe responses

Always respond with valid JSON in this format:
{
  "question": "Your question here",
  "rationale": "Why you're asking this question",
  "confidence": 0.0-1.0,
  "type": "text|likert|choice"
}`,

  summarizeSession: `You are summarizing a completed 20 Questions session. Create a concise, insightful summary of what you learned about the user's goal or problem.

Session data:
{turns}

Goal: {goal}

Guidelines:
- Summarize the key insights about their situation
- Highlight any patterns or themes you noticed
- Include any constraints or challenges they mentioned
- Suggest potential next steps or areas to explore
- Keep it concise but comprehensive (2-3 paragraphs)

Respond with a clear, well-structured summary.`,

  calendarNudge: `You are analyzing a user's calendar to determine if and when to send them a nudge about their 20 Questions goal.

       User's goal: {goal}

       Calendar events (next 24-72 hours) - BOTH Personal and Work calendars overlaid:
       {calendar}

       Guidelines:
       - You can see the FULL schedule across both personal and work contexts
       - Consider if there's a good time to remind them about their goal
       - Look for natural breaks or transition periods in either calendar
       - Avoid times when they're likely busy or stressed in either context
       - Consider if their goal relates to any upcoming events in either calendar
       - Only suggest nudging if it would be helpful and well-timed
       - The goal may be personal or work-related, but you have visibility into both schedules

       Respond with JSON:
       {
         "shouldNudge": true/false,
         "reason": "Why you're suggesting this nudge",
         "timing": "When to send the nudge",
         "message": "The nudge message to send"
       }`
};

export function buildPrompt(session: SessionState, currentTurn: number): string {
  const turns = session.turns.map((turn, index) => 
    `Q${index + 1}: ${turn.question}\nA: ${turn.answer}`
  ).join('\n\n');

  if (currentTurn === 0) {
    // First question - goal definition phase
    return PROMPTS.goalDefinition;
  } else {
    // Subsequent questions - use the generate turn prompt
    return PROMPTS.generateTurn
      .replace('{turns}', turns)
      .replace('{goal}', session.goal || 'Not yet defined');
  }
}

export function buildSummaryPrompt(session: SessionState): string {
  const turns = session.turns.map((turn, index) => 
    `Q${index + 1}: ${turn.question}\nA: ${turn.answer}`
  ).join('\n\n');

  return PROMPTS.summarizeSession
    .replace('{turns}', turns)
    .replace('{goal}', session.goal || 'Not defined');
}

export function buildCalendarPrompt(goal: string, calendar: string): string {
  return PROMPTS.calendarNudge
    .replace('{goal}', goal)
    .replace('{calendar}', calendar);
}
