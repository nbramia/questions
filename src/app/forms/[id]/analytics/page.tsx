'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DarkModeToggle } from '@/components/dark-mode-toggle';

interface FormConfig {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  status: 'active' | 'disabled';
}

interface Question {
  id: string;
  type: 'text' | 'yesno' | 'mcq' | 'checkbox' | 'scale' | 'likert';
  label: string;
  options?: string[];
  scaleRange?: number;
}

interface Response {
  id: string;
  timestamp: string;
  answers: {
    [questionId: string]: string | string[] | number;
  };
  metadata?: {
    ip?: string;
    userAgent?: string;
  };
}

interface QuestionAnalytics {
  questionId: string;
  questionLabel: string;
  questionType: string;
  totalResponses: number;
  responseRate: number;
  data: unknown; // Will be typed based on question type
}

interface AIInsight {
  type: 'theme' | 'trend' | 'correlation' | 'anomaly' | 'summary';
  title: string;
  description: string;
  confidence: number;
  relatedQuestions?: string[];
  data?: unknown;
}

export default function FormAnalytics() {
  const params = useParams();
  const formId = params.id as string;
  
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [analytics, setAnalytics] = useState<QuestionAnalytics[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('all');
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch form configuration and responses
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setLoading(true);
        
        // Fetch form config
        const configResponse = await fetch(`/api/forms/${formId}`);
        if (!configResponse.ok) throw new Error('Failed to fetch form config');
        const configHtml = await configResponse.text();
        
        // Extract config from HTML
        const configMatch = configHtml.match(/let config = ({.*?});/);
        if (!configMatch) throw new Error('Could not extract form config');
        const config = JSON.parse(configMatch[1]);
        setFormConfig(config);

        // Fetch responses
        const responsesResponse = await fetch(`/api/forms/${formId}/analytics/responses`);
        if (!responsesResponse.ok) throw new Error('Failed to fetch responses');
        const responsesData = await responsesResponse.json();
        setResponses(responsesData.responses || []);

        // Initialize selected questions
        setSelectedQuestions(config.questions.map((q: Question) => q.id));

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      fetchFormData();
    }
  }, [formId]);

  // Generate analytics when responses change
  useEffect(() => {
    if (formConfig && responses.length > 0) {
      const analyticsData = generateAnalytics(formConfig, responses);
      setAnalytics(analyticsData);
    }
  }, [formConfig, responses]);

  // Generate AI insights
  useEffect(() => {
    if (analytics.length > 0 && responses.length > 0) {
      generateAIInsights();
    }
  }, [analytics, responses]);

  const generateAnalytics = (config: FormConfig, responses: Response[]): QuestionAnalytics[] => {
    return config.questions.map(question => {
      const questionResponses = responses.filter(r => r.answers[question.id] !== undefined);
      const totalResponses = responses.length;
      const responseRate = totalResponses > 0 ? (questionResponses.length / totalResponses) * 100 : 0;

      let data: unknown = {};

      switch (question.type) {
        case 'text':
          data = {
            totalTextResponses: questionResponses.length,
            averageLength: questionResponses.length > 0 
              ? questionResponses.reduce((sum, r) => {
                  const text = String(r.answers[question.id]);
                  return sum + text.length;
                }, 0) / questionResponses.length
              : 0,
            wordCounts: questionResponses.map(r => {
              const text = String(r.answers[question.id]);
              return text.split(/\s+/).length;
            }),
            commonWords: getCommonWords(questionResponses.map(r => String(r.answers[question.id])))
          };
          break;

        case 'yesno':
        case 'mcq':
          data = {
            options: question.options || ['Yes', 'No'],
            counts: question.options?.map(option => 
              questionResponses.filter(r => r.answers[question.id] === option).length
            ) || [0, 0],
            percentages: question.options?.map(option => {
              const count = questionResponses.filter(r => r.answers[question.id] === option).length;
              return questionResponses.length > 0 ? (count / questionResponses.length) * 100 : 0;
            }) || [0, 0]
          };
          break;

        case 'checkbox':
          data = {
            options: question.options || [],
            counts: question.options?.map(option => 
              questionResponses.filter(r => {
                const answers = Array.isArray(r.answers[question.id]) 
                  ? r.answers[question.id] as string[]
                  : [String(r.answers[question.id])];
                return answers.includes(option);
              }).length
            ) || [],
            percentages: question.options?.map(option => {
              const count = questionResponses.filter(r => {
                const answers = Array.isArray(r.answers[question.id]) 
                  ? r.answers[question.id] as string[]
                  : [String(r.answers[question.id])];
                return answers.includes(option);
              }).length;
              return questionResponses.length > 0 ? (count / questionResponses.length) * 100 : 0;
            }) || []
          };
          break;

        case 'scale':
          data = {
            scaleRange: question.scaleRange || 5,
            values: questionResponses.map(r => Number(r.answers[question.id])),
            average: questionResponses.length > 0 
              ? questionResponses.reduce((sum, r) => sum + Number(r.answers[question.id]), 0) / questionResponses.length
              : 0,
            distribution: Array.from({ length: question.scaleRange || 5 }, (_, i) => 
              questionResponses.filter(r => Number(r.answers[question.id]) === i + 1).length
            )
          };
          break;

        case 'likert':
          data = {
            options: question.options || [],
            counts: question.options?.map(option => 
              questionResponses.filter(r => r.answers[question.id] === option).length
            ) || [],
            percentages: question.options?.map(option => {
              const count = questionResponses.filter(r => r.answers[question.id] === option).length;
              return questionResponses.length > 0 ? (count / questionResponses.length) * 100 : 0;
            }) || []
          };
          break;
      }

      return {
        questionId: question.id,
        questionLabel: question.label,
        questionType: question.type,
        totalResponses: questionResponses.length,
        responseRate,
        data
      };
    });
  };

  const getCommonWords = (texts: string[]): { word: string; count: number }[] => {
    const wordCount: { [key: string]: number } = {};
    
    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    return Object.entries(wordCount)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const generateAIInsights = async () => {
    try {
      setInsightsLoading(true);
      
      const response = await fetch(`/api/forms/${formId}/analytics/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formConfig,
          responses,
          analytics,
          selectedQuestions,
          dateRange
        }),
      });

      if (!response.ok) throw new Error('Failed to generate insights');
      
      const insights = await response.json();
      setAiInsights(insights.insights || []);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setInsightsLoading(false);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'yesno': return '✅';
      case 'mcq': return '🔘';
      case 'checkbox': return '☑️';
      case 'scale': return '📊';
      case 'likert': return '📈';
      default: return '❓';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'Text Response';
      case 'yesno': return 'Yes/No';
      case 'mcq': return 'Multiple Choice';
      case 'checkbox': return 'Checkboxes';
      case 'scale': return 'Scale';
      case 'likert': return 'Likert Scale';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <p className="font-medium">{error}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-600 dark:text-gray-300">
                <p className="font-medium">Form not found</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics: {formConfig?.title || 'Loading...'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {responses.length} responses • {formConfig?.questions?.length || 0} questions
            </p>
          </div>
          <div className="flex gap-3">
            <DarkModeToggle />
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue>{dateRange === 'all' ? 'All Time' : dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : 'Last 90 Days'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Types
                </Label>
                <div className="space-y-2">
                  {formConfig?.questions?.map(question => (
                    <div key={question.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={question.id}
                        checked={selectedQuestions.includes(question.id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedQuestions([...selectedQuestions, question.id]);
                          } else {
                            setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                          }
                        }}
                      />
                      <Label htmlFor={question.id} className="text-sm">
                        {getQuestionTypeIcon(question.type)} {question.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actions
                </Label>
                <Button 
                  onClick={generateAIInsights}
                  disabled={insightsLoading}
                  className="w-full"
                >
                  {insightsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Insights...
                    </>
                  ) : (
                    'Refresh AI Insights'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="responses">Raw Responses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Responses</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{responses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <span className="text-2xl">❓</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Questions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formConfig?.questions?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <span className="text-2xl">📝</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Text Questions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formConfig?.questions?.filter(q => q.type === 'text').length || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <span className="text-2xl">📈</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Rate</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics.length > 0 
                          ? Math.round(analytics.reduce((sum, a) => sum + a.responseRate, 0) / analytics.length)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Response Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart component will be implemented here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            {analytics.map(questionAnalytics => (
              <Card key={questionAnalytics.questionId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getQuestionTypeIcon(questionAnalytics.questionType)}
                        {questionAnalytics.questionLabel}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {getQuestionTypeLabel(questionAnalytics.questionType)} • {questionAnalytics.totalResponses} responses
                      </p>
                    </div>
                    <Badge variant={questionAnalytics.responseRate > 80 ? "default" : "secondary"}>
                      {Math.round(questionAnalytics.responseRate)}% response rate
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Chart for {questionAnalytics.questionType} will be implemented here
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {aiInsights.length > 0 ? (
              aiInsights.map((insight, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {insight.type === 'theme' && '🎯'}
                        {insight.type === 'trend' && '📈'}
                        {insight.type === 'correlation' && '🔗'}
                        {insight.type === 'anomaly' && '⚠️'}
                        {insight.type === 'summary' && '📋'}
                        {insight.title}
                      </CardTitle>
                      <Badge variant="outline">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{insight.description}</p>
                    {insight.relatedQuestions && insight.relatedQuestions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Related Questions:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {insight.relatedQuestions.map(questionId => {
                            const question = formConfig?.questions.find(q => q.id === questionId);
                            return question ? (
                              <Badge key={questionId} variant="secondary">
                                {question.label}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  {insightsLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      Generating AI insights...
                    </div>
                  ) : (
                    <p>No AI insights available yet. Click &quot;Refresh AI Insights&quot; to generate them.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="responses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Raw Response Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Timestamp
                        </th>
                        {formConfig?.questions?.map(question => (
                          <th key={question.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {question.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {responses.slice(0, 10).map((response, index) => (
                        <tr key={response.id || index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(response.timestamp).toLocaleDateString()}
                          </td>
                          {formConfig?.questions?.map(question => (
                            <td key={question.id} className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              {response.answers[question.id] ? (
                                Array.isArray(response.answers[question.id]) 
                                  ? (response.answers[question.id] as string[]).join(', ')
                                  : String(response.answers[question.id])
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {responses.length > 10 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    Showing first 10 of {responses.length} responses
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 