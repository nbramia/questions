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
    
    console.log('Loading form with ID:', id);
    
    // Fetch the config from our local API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const configUrl = `${baseUrl}/api/forms/${id}`;
    console.log('Fetching config from:', configUrl);
    
    const configResponse = await fetch(configUrl, { 
      cache: 'no-store'
    });
    
    console.log('Config response status:', configResponse.status);
    
    if (!configResponse.ok) {
      console.error('Config not found:', configResponse.status, configResponse.statusText);
      notFound();
    }
    
    const config = await configResponse.json();
    console.log('Config loaded successfully');

    // Fetch the template HTML from GitHub Pages
    const templateUrl = `https://nbramia.github.io/questions/question/${id}/index.html`;
    console.log('Fetching template from:', templateUrl);
    
    const templateResponse = await fetch(templateUrl, { 
      cache: 'no-store',
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; FormLoader/1.0)'
      }
    });
    
    console.log('Template response status:', templateResponse.status);
    
    if (!templateResponse.ok) {
      console.error('Template not found:', templateResponse.status, templateResponse.statusText);
      notFound();
    }
    
    const templateHtml = await templateResponse.text();
    console.log('Template loaded successfully');

    return (
      <div dangerouslySetInnerHTML={{ __html: templateHtml }} />
    );
  } catch (error) {
    console.error('Error loading form:', error);
    notFound();
  }
} 