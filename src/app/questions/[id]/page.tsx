import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionPage({ params }: PageProps) {
  try {
    const { id } = await params;
    
    console.log('Loading form with ID:', id);
    
    // Fetch the complete HTML from our API
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
    
    const html = await response.text();
    console.log('HTML loaded successfully');
    
    // Return the HTML directly without React wrapping
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error loading form:', error);
    notFound();
  }
} 