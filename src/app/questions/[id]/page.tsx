'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function QuestionPage({ params }: PageProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadForm() {
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
          setError(true);
          return;
        }
        
        const html = await response.text();
        console.log('HTML loaded successfully');
        
        setHtmlContent(html);
        setLoading(false);
      } catch (error) {
        console.error('Error loading form:', error);
        setError(true);
      }
    }

    loadForm();
  }, [params]);

  useEffect(() => {
    if (htmlContent && !loading) {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Extract the script content
      const scriptElement = tempDiv.querySelector('script');
      if (scriptElement) {
        const scriptContent = scriptElement.textContent;
        
        // Execute the script in the global context
        const newScript = document.createElement('script');
        newScript.textContent = scriptContent || '';
        document.head.appendChild(newScript);
      }
    }
  }, [htmlContent, loading]);

  if (error) {
    notFound();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
} 