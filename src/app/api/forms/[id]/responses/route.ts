import { NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`Fetching responses for form ID: ${id}`);
    console.log(`Using Google Script URL: ${GOOGLE_SCRIPT_URL}`);
    
    // Call Google Apps Script to get response data
    const url = `${GOOGLE_SCRIPT_URL}?action=getResponses&formId=${id}`;
    console.log(`Calling URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(`Failed to fetch responses: ${response.status} ${response.statusText}`);
      return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
    }

    const responseText = await response.text();
    console.log(`Raw response text: ${responseText}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', responseText);
      return NextResponse.json({ error: "Invalid JSON response from Google Script" }, { status: 500 });
    }
    
    console.log(`Parsed response data:`, data);
    
    if (data.error) {
      console.error(`Google Script returned error: ${data.error}`);
      return NextResponse.json({ error: `Google Script error: ${data.error}` }, { status: 500 });
    }
    
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