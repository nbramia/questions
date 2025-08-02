import { NextRequest, NextResponse } from 'next/server';

interface QuestionAnalytics {
  questionId: string;
  questionLabel: string;
  questionType: string;
  totalResponses: number;
  responseRate: number;
  data: unknown;
}

interface AIInsight {
  type: 'theme' | 'trend' | 'correlation' | 'anomaly' | 'summary';
  title: string;
  description: string;
  confidence: number;
  relatedQuestions?: string[];
  data?: unknown;
}

interface AnalysisData {
  formTitle: string;
  formDescription?: string;
  totalResponses: number;
  questions: Array<{ id: string; label: string; type: string }>;
  analytics: QuestionAnalytics[];
  responses: Array<{ timestamp: string; answers: Record<string, unknown> }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { formConfig, responses, analytics, selectedQuestions, dateRange } = await request.json();
    const { id } = await params;

    if (!formConfig || !responses || !analytics) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Filter responses based on date range
    let filteredResponses = responses;
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (dateRange) {
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filteredResponses = responses.filter((response: { timestamp: string }) => 
        new Date(response.timestamp) >= cutoffDate
      );
    }

    // Filter analytics based on selected questions
    const filteredAnalytics = analytics.filter((analytic: QuestionAnalytics) =>
      selectedQuestions.includes(analytic.questionId)
    );

    // Prepare data for AI analysis
    const analysisData = {
      formTitle: formConfig.title,
      formDescription: formConfig.description,
      totalResponses: filteredResponses.length,
      questions: formConfig.questions.filter((q: { id: string }) => selectedQuestions.includes(q.id)),
      analytics: filteredAnalytics,
      responses: filteredResponses
    };

    // Generate AI insights
    const insights = await generateInsights(analysisData);

    return NextResponse.json({
      insights,
      total: insights.length
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateInsights(analysisData: AnalysisData): Promise<AIInsight[]> {
  const insights: AIInsight[] = [];

  try {
    // Call OpenAI API for comprehensive analysis
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an expert data analyst specializing in form response analysis. Your task is to analyze form responses and generate insightful observations about patterns, themes, correlations, and trends.

You should look for:
1. **Themes** in text responses - recurring topics, sentiments, or concerns
2. **Trends** - patterns over time or across different question types
3. **Correlations** - relationships between different questions or response patterns
4. **Anomalies** - unusual patterns or outliers in the data
5. **Summaries** - high-level insights about the overall response set

For each insight, provide:
- A clear, descriptive title
- A detailed explanation of the finding
- Confidence level (0-1) based on the strength of the evidence
- Related question IDs if applicable

Respond with valid JSON array of insights.`
          },
          {
            role: 'user',
            content: `Analyze this form data and generate insights:

Form: ${analysisData.formTitle}
Description: ${analysisData.formDescription || 'No description'}
Total Responses: ${analysisData.totalResponses}

Questions and Analytics:
${analysisData.analytics.map((analytic: QuestionAnalytics) => `
- ${analytic.questionLabel} (${analytic.questionType}): ${analytic.totalResponses} responses, ${Math.round(analytic.responseRate)}% response rate
  ${analytic.questionType === 'text' ? `Average length: ${Math.round((analytic.data as { averageLength?: number })?.averageLength || 0)} characters` : ''}
  ${analytic.questionType === 'yesno' || analytic.questionType === 'mcq' ? `Options: ${(analytic.data as { options?: string[] })?.options?.join(', ')}` : ''}
  ${analytic.questionType === 'scale' ? `Average rating: ${(analytic.data as { average?: number })?.average?.toFixed(1) || 0}` : ''}
`).join('')}

Sample Text Responses (first 5):
${analysisData.responses.slice(0, 5).map((response: { answers: Record<string, unknown> }) => {
  const textAnswers = Object.entries(response.answers)
    .filter(([questionId, answer]) => {
      const question = analysisData.questions.find((q: { id: string; type: string; label: string }) => q.id === questionId);
      return question?.type === 'text' && answer;
    })
    .map(([questionId, answer]) => {
      const question = analysisData.questions.find((q: { id: string; type: string; label: string }) => q.id === questionId);
      return `${question?.label}: ${answer}`;
    })
    .join('; ');
  return textAnswers;
}).filter(Boolean).join('\n')}

Generate 3-5 most valuable insights from this data.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    try {
      const parsedInsights = JSON.parse(content);
      if (Array.isArray(parsedInsights)) {
        insights.push(...parsedInsights);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Fallback to generating basic insights
      insights.push(...generateFallbackInsights(analysisData));
    }

  } catch (error) {
    console.error('Error calling OpenAI:', error);
    // Generate fallback insights
    insights.push(...generateFallbackInsights(analysisData));
  }

  return insights;
}

function generateFallbackInsights(analysisData: AnalysisData): AIInsight[] {
  const insights: AIInsight[] = [];

  // Basic response rate insight
  const avgResponseRate = analysisData.analytics.reduce((sum: number, a: QuestionAnalytics) => sum + a.responseRate, 0) / analysisData.analytics.length;
  insights.push({
    type: 'trend',
    title: 'Overall Response Rate',
    description: `The form has an average response rate of ${Math.round(avgResponseRate)}% across all questions. ${avgResponseRate > 80 ? 'This indicates good engagement.' : avgResponseRate > 60 ? 'This suggests moderate engagement.' : 'This indicates low engagement.'}`,
    confidence: 0.9,
    relatedQuestions: analysisData.analytics.map((a: QuestionAnalytics) => a.questionId)
  });

  // Text response insight
  const textQuestions = analysisData.analytics.filter((a: QuestionAnalytics) => a.questionType === 'text');
  if (textQuestions.length > 0) {
    const avgLength = textQuestions.reduce((sum: number, a: QuestionAnalytics) => sum + ((a.data as { averageLength?: number })?.averageLength || 0), 0) / textQuestions.length;
    insights.push({
      type: 'summary',
      title: 'Text Response Patterns',
      description: `Text responses average ${Math.round(avgLength)} characters. ${avgLength > 100 ? 'Users are providing detailed responses.' : avgLength > 50 ? 'Users are providing moderate responses.' : 'Users are providing brief responses.'}`,
      confidence: 0.8,
      relatedQuestions: textQuestions.map((a: QuestionAnalytics) => a.questionId)
    });
  }

  // Multiple choice insight
  const mcqQuestions = analysisData.analytics.filter((a: QuestionAnalytics) => a.questionType === 'mcq' || a.questionType === 'yesno');
  if (mcqQuestions.length > 0) {
    const mostPopularOption = mcqQuestions.map((q: QuestionAnalytics) => {
      const data = q.data as { counts?: number[]; options?: string[] };
      const maxIndex = data.counts?.indexOf(Math.max(...(data.counts || [])));
      return { question: q.questionLabel, option: data.options?.[maxIndex || 0] || 'Unknown' };
    });
    
         insights.push({
       type: 'trend',
       title: 'Most Popular Choices',
       description: `Analysis shows the most selected options: ${mostPopularOption.map((m: { question: string; option: string }) => `${m.question}: ${m.option}`).join(', ')}`,
       confidence: 0.7,
       relatedQuestions: mcqQuestions.map((a: QuestionAnalytics) => a.questionId)
     });
  }

  return insights;
} 