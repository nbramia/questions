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
        
        // Fetch both config and template from our local API
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
        
        const data = await response.json();
        console.log('Data loaded successfully');
        
        setHtmlContent(data.template);
        setLoading(false);
      } catch (error) {
        console.error('Error loading form:', error);
        setError(true);
      }
    }

    loadForm();
  }, [params]);

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