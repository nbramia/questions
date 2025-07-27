import { buildPrompt } from './prompts';

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

interface AgentResponse {
  question: string;
  rationale: string;
  confidence: number;
  type: 'text' | 'likert' | 'choice';
}

export async function generateNextTurn(
  session: SessionState,
  currentTurn: number
): Promise<AgentResponse> {
  try {
    // Build the prompt for the LLM
    const prompt = buildPrompt(session, currentTurn);

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
            content: 'You are an intelligent agent conducting a 20 Questions session. Your goal is to ask the most relevant question to understand the user\'s goal or problem. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to generate question');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let agentResponse: AgentResponse;
    try {
      agentResponse = JSON.parse(content);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Validate response structure
    if (!agentResponse.question || !agentResponse.rationale || typeof agentResponse.confidence !== 'number' || !agentResponse.type) {
      throw new Error('Invalid response structure from AI');
    }

    // Ensure confidence is between 0 and 1
    agentResponse.confidence = Math.max(0, Math.min(1, agentResponse.confidence));

    // Ensure type is valid
    if (!['text', 'likert', 'choice'].includes(agentResponse.type)) {
      agentResponse.type = 'text';
    }

    return agentResponse;

  } catch (error) {
    console.error('Error in generateNextTurn:', error);
    throw error;
  }
}

export async function analyzeSession(session: SessionState): Promise<{
  insights: string[];
  recommendations: string[];
  confidence: number;
}> {
  try {
    const turns = session.turns.map((turn, index) =>
      `Q${index + 1}: ${turn.question}\nA: ${turn.answer}`
    ).join('\n\n');

    const prompt = `Analyze this 20 Questions session and provide insights and recommendations:

Session data:
${turns}

Goal: ${session.goal}

Please provide:
1. Key insights about the user's situation
2. Specific recommendations for next steps
3. Overall confidence in understanding (0-1)

Respond with JSON:
{
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": 0.8
}`;

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
            content: 'You are an AI assistant that analyzes 20 Questions sessions to provide insights and recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze session');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No analysis generated');
    }

    const analysis = JSON.parse(content);

    return {
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      confidence: analysis.confidence || 0
    };

  } catch (error) {
    console.error('Error analyzing session:', error);
    return {
      insights: ['Analysis failed'],
      recommendations: ['Try again later'],
      confidence: 0
    };
  }
}
