// src/app/questions/[id]/page.tsx
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionPage({ params }: PageProps) {
  try {
    // Await the params Promise
    const { id } = await params;
    
    // Fetch the config from the deployed GitHub Pages URL
    const configUrl = `https://nbramia.github.io/questions/question/${id}/config.json`;
    const configResponse = await fetch(configUrl);
    
    if (!configResponse.ok) {
      console.error('Config not found:', configResponse.status);
      notFound();
    }
    
    const config = await configResponse.json();

    // Fetch the template HTML
    const templateUrl = `https://nbramia.github.io/questions/question/${id}/index.html`;
    const templateResponse = await fetch(templateUrl);
    
    if (!templateResponse.ok) {
      console.error('Template not found:', templateResponse.status);
      notFound();
    }
    
    const templateHtml = await templateResponse.text();

    return (
      <div dangerouslySetInnerHTML={{ __html: templateHtml }} />
    );
  } catch (error) {
    console.error('Error loading form:', error);
    notFound();
  }
} 