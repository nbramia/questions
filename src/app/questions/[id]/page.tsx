// src/app/questions/[id]/page.tsx
import { notFound } from 'next/navigation';
import { readFile } from 'fs/promises';
import path from 'path';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function QuestionPage({ params }: PageProps) {
  try {
    // Try to read the config file for this form
    const configPath = path.join(process.cwd(), 'docs', 'questions', params.id, 'config.json');
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Read the template HTML
    const templatePath = path.join(process.cwd(), 'public', 'template', 'index.html');
    const templateHtml = await readFile(templatePath, 'utf-8');

    // Inject the config into the template
    const htmlWithConfig = templateHtml.replace(
      'const configPath = "./config.json";',
      `const config = ${JSON.stringify(config)};`
    );

    return (
      <div dangerouslySetInnerHTML={{ __html: htmlWithConfig }} />
    );
  } catch (error) {
    console.error('Error loading form:', error);
    notFound();
  }
} 