'use client';
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormInfo {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
  status: 'active' | 'disabled';
  url: string;
}

export default function AdminDashboard() {
  const [auth, setAuth] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingForms, setUpdatingForms] = useState<{[key: string]: number}>({}); // Track countdown for each form

  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  // Check for existing authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
      setAuthenticated(true);
    }
  }, []);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/forms");
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      } else {
        setError("Failed to fetch forms");
      }
    } catch (err) {
      setError("Error loading forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchForms();
    }
  }, [authenticated, fetchForms]);

  // Handle countdown timers for updating forms
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    Object.entries(updatingForms).forEach(([formId, countdown]) => {
      if (countdown > 0) {
        const timer = setInterval(() => {
          setUpdatingForms(prev => {
            const newState = { ...prev };
            if (newState[formId] > 0) {
              newState[formId] = newState[formId] - 1;
            } else {
              delete newState[formId];
              // Refresh forms list when countdown reaches 0
              fetchForms();
            }
            return newState;
          });
        }, 1000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearInterval(timer));
    };
  }, [updatingForms, fetchForms]);

  const handleLogin = () => {
    if (auth === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show a brief success message
      const button = event?.target as HTMLButtonElement;
      if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = `
          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        `;
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-gray-50">
        <Card className="p-6 w-full max-w-sm">
          <CardContent>
            <CardTitle className="mb-4 text-center">Admin Dashboard</CardTitle>
            <Label className="mb-2 block">Password</Label>
            <Input
              type="password"
              value={auth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuth(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  handleLogin();
                }
              }}
              className="mb-4"
            />
            <Button onClick={handleLogin} className="w-full cursor-pointer">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 sm:px-8 pt-12 pb-24 font-sans bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your feedback forms</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => {
                localStorage.removeItem('adminAuthenticated');
                setAuthenticated(false);
              }}
              variant="outline"
              className="cursor-pointer"
            >
              Log Out
            </Button>
            <Button 
              onClick={() => window.location.href = '/create'}
              className="bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
            >
              Create New Form
            </Button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Search Forms</Label>
              <Input
                type="text"
                placeholder="Search by title or ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredForms.length} of {forms.length} forms
            </div>
          </div>
        </div>

        {/* Forms List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading forms...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-red-600">
              <p className="font-medium">{error}</p>
              <Button 
                onClick={fetchForms}
                className="mt-4 bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-600">
              <p className="font-medium">No forms found</p>
              <p className="text-sm mt-1">
                {searchTerm ? "Try adjusting your search terms" : "Create your first form to get started"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredForms.map((form) => (
              <Card key={form.id} className="shadow-sm border border-gray-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {form.title}
                      </CardTitle>
                      {form.description && (
                        <p className="text-gray-600 text-sm mb-3">{form.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>ID: {form.id}</span>
                        <span>Created: {formatDate(form.created_at)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          form.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => window.open(form.url, '_blank')}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open
                    </Button>
                    
                    <Button
                      onClick={() => copyToClipboard(form.url)}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        try {
                          // Fetch the form config to get the data
                          const response = await fetch(`/api/forms/${form.id}`);
                          if (response.ok) {
                            const htmlContent = await response.text();
                            
                            // Extract the config from the HTML (it's injected as a script)
                            const configMatch = htmlContent.match(/let config = ({.*?});/);
                            if (configMatch) {
                              const config = JSON.parse(configMatch[1]);
                              
                              // Navigate to admin page with the form data for editing
                              const formData = encodeURIComponent(JSON.stringify({
                                formId: form.id, // Include the original form ID for editing
                                title: config.title,
                                description: config.description || '',
                                questions: config.questions,
                                enforceUnique: config.enforceUnique,
                                expires_at: config.expires_at, // Keep original expiration
                              }));
                              
                              window.open(`/create?edit=${formData}`, '_blank');
                            } else {
                              alert('Could not extract form data');
                            }
                          } else {
                            alert('Failed to load form data');
                          }
                        } catch (err) {
                          alert('Error loading form data');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        try {
                          // Fetch the form config to get the data
                          const response = await fetch(`/api/forms/${form.id}`);
                          if (response.ok) {
                            const htmlContent = await response.text();
                            
                            // Extract the config from the HTML (it's injected as a script)
                            const configMatch = htmlContent.match(/let config = ({.*?});/);
                            if (configMatch) {
                              const config = JSON.parse(configMatch[1]);
                              
                              // Navigate to admin page with the form data
                              const formData = encodeURIComponent(JSON.stringify({
                                title: `${config.title} (Copy)`,
                                description: config.description || '',
                                questions: config.questions,
                                enforceUnique: config.enforceUnique,
                                // Don't include expiration - let user set it fresh
                              }));
                              
                              window.open(`/create?duplicate=${formData}`, '_blank');
                            } else {
                              alert('Could not extract form data');
                            }
                          } else {
                            alert('Failed to load form data');
                          }
                        } catch (err) {
                          alert('Error loading form data');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        const action = form.status === 'active' ? 'disable' : 'enable';
                        
                        // Start updating state with 60 second countdown
                        setUpdatingForms(prev => ({ ...prev, [form.id]: 60 }));
                        
                        try {
                          const response = await fetch(`/api/forms/${form.id}/toggle`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ action }),
                          });
                          if (response.ok) {
                            // Countdown will handle the refresh when it reaches 0
                          } else {
                            alert(`Failed to ${action} form`);
                            // Remove from updating state on error
                            setUpdatingForms(prev => {
                              const newState = { ...prev };
                              delete newState[form.id];
                              return newState;
                            });
                          }
                        } catch (err) {
                          alert(`Error ${action}ing form`);
                          // Remove from updating state on error
                          setUpdatingForms(prev => {
                            const newState = { ...prev };
                            delete newState[form.id];
                            return newState;
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className={`cursor-pointer ${
                        updatingForms[form.id] !== undefined 
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200' 
                          : ''
                      }`}
                      disabled={updatingForms[form.id] !== undefined}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      {updatingForms[form.id] !== undefined 
                        ? `Updating (${updatingForms[form.id]}s)` 
                        : (form.status === 'active' ? 'Disable' : 'Enable')
                      }
                    </Button>
                    
                    <Button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete "${form.title}"? This action cannot be undone.`)) {
                          try {
                            const response = await fetch(`/api/forms/${form.id}`, {
                              method: 'DELETE',
                            });
                            if (response.ok) {
                              // Refresh the forms list
                              fetchForms();
                            } else {
                              alert('Failed to delete form');
                            }
                          } catch (err) {
                            alert('Error deleting form');
                          }
                        }
                      }}
                      variant="destructive"
                      size="sm"
                      className="cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}