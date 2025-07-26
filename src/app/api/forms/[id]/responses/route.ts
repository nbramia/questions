import { NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Call Google Apps Script to get response data
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResponses&formId=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      totalResponses: data.totalResponses || 0,
      lastResponseAt: data.lastResponseAt || null,
      responses: data.responses || []
    });
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
  }
} 