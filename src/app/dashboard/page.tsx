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
}

export default function AdminDashboard() {
  const [auth, setAuth] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingForms, setUpdatingForms] = useState<{[key: string]: number}>({}); // Track countdown for each form
  const [qrCodeData, setQRCodeData] = useState<{[key: string]: string}>({}); // Track QR codes for each form
  const [showQRModal, setShowQRModal] = useState(false);
  const [currentQRForm, setCurrentQRForm] = useState<string | null>(null);

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
    <div className="min-h-screen px-4 sm:px-8 pt-12 pb-24 font-sans bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Manage forms</p>
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
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Forms</Label>
              <Input
                type="text"
                placeholder="Search by title or ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredForms.length} of {forms.length} forms
            </div>
          </div>
        </div>

        {/* Forms List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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
        ) : filteredForms.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center text-gray-600 dark:text-gray-300">
              <p className="font-medium">No forms found</p>
              <p className="text-sm mt-1">
                {searchTerm ? "Try adjusting your search terms" : "Create your first form to get started"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredForms.map((form) => (
              <Card key={form.id} className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
                <CardContent>
                  <div className="flex gap-6">
                    {/* Left side - Form info and primary actions */}
                    <div className="flex-1 min-w-0">
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
                        ID: {form.id} • {form.updated_at && form.updated_at !== form.created_at ? 'Updated' : 'Created'}: {formatDate(form.updated_at && form.updated_at !== form.created_at ? form.updated_at : form.created_at)}{getExpirationInfo(form.expires_at, form.status) && ` • ${getExpirationInfo(form.expires_at, form.status)}`}
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

                    {/* Right side - Management actions */}
                    <div className="flex flex-col gap-2 min-w-fit self-center">
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