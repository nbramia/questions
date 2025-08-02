import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params;

    // Get the base URL from the request
    const baseUrl = request.nextUrl.origin;
    
    // Fetch form config first to understand the structure
    const configResponse = await fetch(`${baseUrl}/api/forms/${formId}`);
    if (!configResponse.ok) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const configHtml = await configResponse.text();
    const configMatch = configHtml.match(/let config = ({.*?});/);
    if (!configMatch) {
      return NextResponse.json(
        { error: 'Could not extract form config' },
        { status: 500 }
      );
    }

    const config = JSON.parse(configMatch[1]);
    const googleScriptUrl = config.googleScriptUrl;

    if (!googleScriptUrl) {
      return NextResponse.json(
        { error: 'No Google Script URL found' },
        { status: 404 }
      );
    }

    // Fetch responses from Google Sheets
    const responsesResponse = await fetch(`${googleScriptUrl}?action=getResponses&formId=${formId}`);
    if (!responsesResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch responses from Google Sheets' },
        { status: 500 }
      );
    }

    const responsesData = await responsesResponse.json();
    
    // Transform the data to match our expected format
    const transformedResponses = responsesData.responses?.map((response: { id?: string; timestamp?: string; answers?: Record<string, unknown>; ip?: string; userAgent?: string }, index: number) => ({
      id: response.id || `response_${index}`,
      timestamp: response.timestamp || new Date().toISOString(),
      answers: response.answers || {},
      metadata: {
        ip: response.ip,
        userAgent: response.userAgent
      }
    })) || [];

    return NextResponse.json({
      responses: transformedResponses,
      total: transformedResponses.length
    });

  } catch (error) {
    console.error('Error fetching responses for analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 