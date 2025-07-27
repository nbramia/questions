'use client';
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

interface FormInfo {
  id: string;
  title: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  status: 'active' | 'disabled';
  isExpired: boolean;
  url: string;
  totalResponses?: number;
  lastResponseAt?: string;
}

export default function AdminDashboard() {
  const [auth, setAuth] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent-response");
  const [updatingForms, setUpdatingForms] = useState<{[key: string]: number}>({}); // Track countdown for each form
  const [qrCodeData, setQRCodeData] = useState<{[key: string]: string}>({}); // Track QR codes for each form
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentQRForm, setCurrentQRForm] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showWithResponsesOnly, setShowWithResponsesOnly] = useState(false);

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
        const formsData = data.forms || [];
        
        // Set forms immediately without response data
        setForms(formsData);
        setLoading(false);
        
        // Load response data in the background
        setLoadingResponses(true);
        const formsWithResponses = await Promise.all(
          formsData.map(async (form: FormInfo) => {
            try {
              const responseData = await fetch(`/api/forms/${form.id}/responses`);
              if (responseData.ok) {
                const responseInfo = await responseData.json();
                return {
                  ...form,
                  totalResponses: responseInfo.totalResponses,
                  lastResponseAt: responseInfo.lastResponseAt
                };
              }
            } catch (error) {
              console.error(`Error fetching responses for form ${form.id}:`, error);
            }
            return form;
          })
        );
        
        // Update forms with response data when it's ready
        setForms(formsWithResponses);
        setLoadingResponses(false);
      } else {
        setError("Failed to fetch forms");
        setLoading(false);
      }
    } catch (err) {
      setError("Error loading forms");
      setLoading(false);
    }
  }, []);

  // Function to generate QR code for a form
  const generateQRCode = useCallback(async (formUrl: string, formId: string) => {
    try {
      const QRCode = (await import('qrcode-svg')).default;
      const qr = new QRCode({
        content: formUrl,
        padding: 4,
        width: 256,
        height: 256,
        color: "#000000",
        background: "#ffffff",
        ecl: "M"
      });
      setQRCodeData(prev => ({ ...prev, [formId]: qr.svg() }));
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, []);

  // Function to download QR code as PNG
  const downloadQRCode = useCallback((formId: string) => {
    const qrData = qrCodeData[formId];
    if (!qrData) return;
    
    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Set canvas size
    canvas.width = 512;
    canvas.height = 512;
    
    img.onload = () => {
      // Fill white background
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the QR code
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Download as PNG
        const link = document.createElement('a');
        link.download = `qrcode-${formId}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    
    // Convert SVG to data URL
    const svgBlob = new Blob([qrData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  }, [qrCodeData]);

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
              // Use setTimeout to ensure this runs after the state update
              setTimeout(() => {
                fetchForms();
              }, 0);
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

  const copyToClipboard = async (text: string, buttonElement?: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Find the button if not provided
      const button = buttonElement || (event?.target as HTMLButtonElement)?.closest('button');
      if (button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = `
          <svg class="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        `;
        setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 3000);
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

  const getExpirationInfo = (expiresAt?: string, status?: string) => {
    // For disabled forms, show nothing regardless of expiration
    if (status === 'disabled') {
      return "";
    }
    
    // For active forms
    if (!expiresAt) {
      return "No expiration";
    }
    
    // Calculate time remaining for active forms with expiration
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Expired";
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `Expires in ${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `Expires in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `Expires in ${diffMinutes}m`;
    }
  };

  const getResponseInfo = (totalResponses?: number, lastResponseAt?: string) => {
    if (totalResponses === undefined || totalResponses === 0) {
      return "No responses yet";
    }
    
    const responseText = totalResponses === 1 ? "response" : "responses";
    let info = `${totalResponses} ${responseText}`;
    
    if (lastResponseAt) {
      const lastResponse = new Date(lastResponseAt);
      const now = new Date();
      const diffMs = now.getTime() - lastResponse.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays > 0) {
        info += ` • Last response ${diffDays}d ago`;
      } else if (diffHours > 0) {
        info += ` • Last response ${diffHours}h ago`;
      } else {
        info += ` • Last response <1h ago`;
      }
    }
    
    return info;
  };

  // Filter and sort forms
  const filteredAndSortedForms = forms
    .filter(form => {
      // Search filter
      const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Active forms filter
      const matchesActiveFilter = !showActiveOnly || form.status === 'active';
      
      // Forms with responses filter
      const matchesResponseFilter = !showWithResponsesOnly || (form.totalResponses && form.totalResponses > 0);
      
      return matchesSearch && matchesActiveFilter && matchesResponseFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "created":
          // Only consider creation date, not updates
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case "updated":
          // Consider both creation and updates - use the most recent of the two
          const aUpdateTime = Math.max(
            new Date(a.created_at || '').getTime(),
            new Date(a.updated_at || '').getTime()
          );
          const bUpdateTime = Math.max(
            new Date(b.created_at || '').getTime(),
            new Date(b.updated_at || '').getTime()
          );
          return bUpdateTime - aUpdateTime;
        case "responses":
          return (b.totalResponses || 0) - (a.totalResponses || 0);
        case "recent-response":
          return (b.lastResponseAt ? new Date(b.lastResponseAt).getTime() : 0) - (a.lastResponseAt ? new Date(a.lastResponseAt).getTime() : 0);
        case "name-asc":
          return (a.title || '').localeCompare(b.title || '');
        case "name-desc":
          return (b.title || '').localeCompare(a.title || '');
        default:
          return 0;
      }
    });

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
    <div className="min-h-screen px-4 sm:px-8 pt-12 pb-24 font-sans bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage forms ({filteredAndSortedForms.length} of {forms.length} forms shown)
            </p>
          </div>
          <div className="flex gap-3">
            <DarkModeToggle />
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-6">
            <div className="grid grid-cols-3 gap-6 w-full">
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Forms</Label>
                <Input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</Label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="recent-response">Most Recent Response</option>
                    <option value="created">Most Recently Created</option>
                    <option value="updated">Most Recently Updated</option>
                    <option value="responses">Most Responses</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filters</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active-only"
                      checked={showActiveOnly}
                      onChange={(e) => setShowActiveOnly(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="active-only" className="text-sm text-gray-700 dark:text-gray-300">
                      Active forms only
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="with-responses"
                      checked={showWithResponsesOnly}
                      onChange={(e) => setShowWithResponsesOnly(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="with-responses" className="text-sm text-gray-700 dark:text-gray-300">
                      Forms with responses
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Forms List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading forms...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center text-red-600 dark:text-red-400">
              <p className="font-medium">{error}</p>
              <Button 
                onClick={fetchForms}
                className="mt-4 bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredAndSortedForms.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center text-gray-600 dark:text-gray-300">
              <p className="font-medium">No forms found</p>
              <p className="text-sm mt-1">
                {searchTerm ? "Try adjusting your search terms" : "Try adjusting your filters"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredAndSortedForms.map((form: FormInfo) => (
              <Card key={form.id} className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    {/* Left column - 50% width (2/4) */}
                    <div className="col-span-2">
                      <div className="flex flex-col justify-center h-full">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            {form.title}
                          </CardTitle>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            form.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {form.status}
                          </span>
                        </div>
                        {form.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                            {form.description}
                          </p>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          {form.updated_at && form.updated_at !== form.created_at ? 'Updated' : 'Created'}: {formatDate(form.updated_at && form.updated_at !== form.created_at ? form.updated_at : form.created_at)}{getExpirationInfo(form.expires_at, form.status) && ` • ${getExpirationInfo(form.expires_at, form.status)}`}
                        </div>
                        
                        {/* Primary actions - horizontal row */}
                        <div className="flex gap-2">
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
                            onClick={(e) => copyToClipboard(form.url, e.currentTarget)}
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
                              if (!qrCodeData[form.id]) {
                                await generateQRCode(form.url, form.id);
                              }
                              setCurrentQRForm(form.id);
                              setShowQRModal(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                            </svg>
                            QR Code
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Middle column - 25% width (1/4) - Response data */}
                    <div className="col-span-1">
                      <div className="text-center flex flex-col justify-center h-full">
                        {form.totalResponses === undefined ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                              {form.totalResponses || 0}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                              {form.totalResponses === 1 ? 'response' : 'responses'}
                            </div>
                            {form.lastResponseAt ? (
                              <>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                  {(() => {
                                    const lastResponse = new Date(form.lastResponseAt);
                                    const now = new Date();
                                    const diffMs = now.getTime() - lastResponse.getTime();
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                    
                                    if (diffDays > 0) {
                                      return `${diffDays}d`;
                                    } else if (diffHours > 0) {
                                      return `${diffHours}h`;
                                    } else {
                                      return `${diffMinutes}m`;
                                    }
                                  })()}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  since last response
                                </div>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right column - 25% width (1/4) - Management actions */}
                    <div className="col-span-1">
                      <div className="flex flex-col gap-2 justify-center h-full">
                      {/* First row - Edit and Duplicate */}
                      <div className="flex gap-2">
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
                      </div>

                      {/* Second row - Disable and Delete */}
                      <div className="flex gap-2">
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
                              ? 'bg-yellow-100 border-yellow-300 text-amber-600 dark:text-amber-300 hover:bg-yellow-200' 
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
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* QR Code Expanded Modal */}
        {showQRModal && currentQRForm && qrCodeData[currentQRForm] && (
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRModal(false)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">QR Code</h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex justify-center mb-6">
                  <div 
                    className="w-80 h-80 bg-white p-6 rounded-lg border border-gray-200 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: qrCodeData[currentQRForm] }}
                  />
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
                  Scan this QR code to open the form directly
                </p>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => downloadQRCode(currentQRForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Download PNG
                  </button>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}