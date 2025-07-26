import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch the config from GitHub Pages
    const configUrl = `https://nbramia.github.io/questions/question/${id}/config.json`;
    const configResponse = await fetch(configUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; FormLoader/1.0)'
      }
    });
    
    if (!configResponse.ok) {
      console.error('Config not found:', configResponse.status);
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    
    const config = await configResponse.json();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error loading form config:', error);
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
} 