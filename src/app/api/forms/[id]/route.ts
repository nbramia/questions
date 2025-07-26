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
    
    // Fetch the template HTML from GitHub Pages
    const templateUrl = `https://nbramia.github.io/questions/question/${id}/index.html`;
    const templateResponse = await fetch(templateUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; FormLoader/1.0)'
      }
    });
    
    if (!templateResponse.ok) {
      console.error('Template not found:', templateResponse.status);
      return NextResponse.json({ error: "Form template not found" }, { status: 404 });
    }
    
    let templateHtml = await templateResponse.text();
    
    // Inject the config into the template and bypass remote fetch
    templateHtml = templateHtml.replace(
      'const configPath = "./config.json";',
      `const config = ${JSON.stringify(config)};`
    ).replace(
      /fetch\(configPath\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?\}\);/,
      'renderForm(config);'  // Call renderForm directly with injected config
    );
    
    return new NextResponse(templateHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error loading form:', error);
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
} 