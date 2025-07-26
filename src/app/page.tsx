'use client';
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RootPage() {
  const [auth, setAuth] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  // Check for existing authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (auth === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-gray-50">
        <Card className="p-6 w-full max-w-sm">
          <CardContent>
            <CardTitle className="mb-4 text-center">Admin Access</CardTitle>
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
    <div className="min-h-screen flex items-center justify-center font-sans bg-gray-50">
      <Card className="p-6 w-full max-w-md">
        <CardContent>
          <CardTitle className="mb-4 text-center">Welcome to Questions</CardTitle>
          <p className="text-gray-600 text-center mb-6">
            Manage your feedback forms and create new ones.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
            >
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/create'}
              variant="outline"
              className="w-full cursor-pointer"
            >
              Create New Form
            </Button>
            <Button 
              onClick={() => {
                localStorage.removeItem('adminAuthenticated');
                setAuthenticated(false);
              }}
              variant="outline"
              className="w-full cursor-pointer"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 