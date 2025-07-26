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
    
    // Fetch both config and template from our local API
    const apiUrl = `/api/forms/${id}`;
    console.log('Fetching from API:', apiUrl);
    
    const response = await fetch(apiUrl, { 
      cache: 'no-store'
    });
    
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      console.error('API not found:', response.status, response.statusText);
      notFound();
    }
    
    const data = await response.json();
    console.log('Data loaded successfully');

    return (
      <div dangerouslySetInnerHTML={{ __html: data.template }} />
    );
  } catch (error) {
    console.error('Error loading form:', error);
    notFound();
  }
} 