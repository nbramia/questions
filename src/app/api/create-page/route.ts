import { NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

interface FormConfig {
  id: string;
  title: string;
  description?: string;
  enforceUnique: boolean;
  questions: {
    id: string;
    type: string;
    label: string;
    options: string[];
    scaleRange?: number;
    skipLogic?: {
      enabled: boolean;
      dependsOn: string;
      condition: string;
      value: string;
    };
  }[];
  googleScriptUrl: string;
  expires_at?: string;
}

export async function POST(req: Request) {
  try {
    console.log("API route called");
    
    const body = await req.json();
    const id = nanoid(6);
    const { title, description, expiration, enforceUnique, questions } = body;

    console.log("Creating form with ID:", id);

    const parsedExpiration = parseExpiration(expiration);
    const config: FormConfig = {
      id,
      title,
      description,
      enforceUnique,
      questions,
      googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec",
    };
    
    // Only include expires_at if there's actually an expiration
    if (parsedExpiration !== null) {
      config.expires_at = parsedExpiration;
    }
    
    const configContent = JSON.stringify(config, null, 2);

    // Create the form directory
    const formDir = path.join(process.cwd(), 'docs', 'question', id);
    await mkdir(formDir, { recursive: true });

    // Write the config file
    const configPath = path.join(formDir, 'config.json');
    await writeFile(configPath, configContent, 'utf-8');

    // Copy the template HTML
    const templatePath = path.join(process.cwd(), 'public', 'template', 'index.html');
    const templateHtml = await readFile(templatePath, 'utf-8');
    const htmlPath = path.join(formDir, 'index.html');
    await writeFile(htmlPath, templateHtml, 'utf-8');

    // URL structure
    const link = `https://ramia.us/questions/${id}/`;
    console.log("Success! Link:", link);
    return NextResponse.json({ link });
  } catch (err) {
    console.error("Error creating form:", err);
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 });
  }
}

function parseExpiration(input: string) {
  if (!input || input.trim() === "") {
    return null; // No expiration
  }
  
  if (input.endsWith("m")) {
    const minutes = parseInt(input.slice(0, -1), 10);
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
  }
  
  if (input.endsWith("h")) {
    const hours = parseInt(input.slice(0, -1), 10);
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
  }
  
  if (input.endsWith("d")) {
    const days = parseInt(input.slice(0, -1), 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
  
  // Try to parse as ISO date
  try {
    return new Date(input).toISOString();
  } catch {
    return null;
  }
}