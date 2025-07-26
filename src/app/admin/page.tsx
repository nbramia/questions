// src/app/admin/page.tsx
'use client';
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


interface Question {
  type: string;
  label: string;
  options: string[];
}

export default function AdminCreatePage() {
  const [auth, setAuth] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expirationNever, setExpirationNever] = useState(false);
  const [expirationValue, setExpirationValue] = useState("24");
  const [expirationUnit, setExpirationUnit] = useState("hours");
  const [enforceUnique, setEnforceUnique] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([
    { type: "yesno", label: "", options: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD; 

  function handleLogin() {
    if (auth === PASSWORD) setAuthenticated(true);
  }

  function handleAddQuestion() {
    setQuestions([...questions, { type: "text", label: "", options: [] }]);
  }

  function handleQuestionChange(index: number, key: keyof Question, value: string | string[]) {
    const updated = [...questions];
    if (key === "type") {
      updated[index].type = value as string;
      if (value !== "mcq" && value !== "checkbox") {
        updated[index].options = [];
      }
    } else if (key === "label") {
      updated[index].label = value as string;
    } else if (key === "options") {
      updated[index].options = value as string[];
    }
    setQuestions(updated);
  }

  async function handleSubmit() {
    setSubmitting(true);
    
    // Build expiration string
    let expiration = "";
    if (!expirationNever) {
      expiration = `${expirationValue}${expirationUnit === "hours" ? "h" : "d"}`;
    }
    
    const payload = {
      title,
      description,
      expiration,
      enforceUnique,
      questions,
    };
  
    try {
      const res = await fetch("/api/create-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
      const data = await res.json();
      if (res.ok && data.link) {
        setResult(data.link);
      } else {
        throw new Error("API call failed");
      }
    } catch (e) {
      console.error(e);
      setResult("Error creating page");
    }
  
    setSubmitting(false);
  }

  if (!authenticated)
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <Card className="p-6 w-full max-w-sm">
          <CardContent>
            <Label className="mb-2 block">Password</Label>
            <Input
              type="password"
              value={auth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuth(e.target.value)}
              className="mb-4"
            />
            <Button onClick={handleLogin} className="w-full">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="min-h-screen p-8 font-sans bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Create New Feedback Page</h1>
        
        {/* Form Configuration Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Form Details</h2>
          
          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Title</Label>
              <Input 
                value={title} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                className="w-full"
                placeholder="Enter form title..."
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</Label>
              <Textarea 
                value={description} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Add a description or instructions for respondents?"
                className="min-h-[100px] w-full"
              />
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Form Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  checked={expirationNever}
                  onCheckedChange={setExpirationNever}
                />
                <Label className="text-sm font-medium text-gray-700">Never Expire</Label>
              </div>
              {!expirationNever && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Expires in:</span>
                  <Input
                    type="number"
                    min="1"
                    value={expirationValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpirationValue(e.target.value)}
                    className="w-20"
                  />
                  <select
                    value={expirationUnit}
                    onChange={(e) => setExpirationUnit(e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  checked={enforceUnique}
                  onCheckedChange={setEnforceUnique}
                />
                <Label className="text-sm font-medium text-gray-700">Enforce Unique by IP/Device</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Questions</h2>
            <Button onClick={handleAddQuestion} variant="outline" size="sm">
              + Add Question
            </Button>
          </div>
          
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={i}>
                <Card className="p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Question {i + 1}</h3>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newQuestions = questions.filter((_, idx) => idx !== i);
                          setQuestions(newQuestions);
                        }}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">Question Text</Label>
                      <Input
                        value={q.label}
                        placeholder="Enter your question..."
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleQuestionChange(i, "label", e.target.value)
                        }
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <Label className="block text-sm font-medium text-gray-700 mb-2">Question Type</Label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={q.type}
                        onChange={(e) =>
                          handleQuestionChange(i, "type", e.target.value)
                        }
                      >
                        <option value="text">Text Response</option>
                        <option value="yesno">Yes/No</option>
                        <option value="mcq">Multiple Choice</option>
                        <option value="checkbox">Checkboxes</option>
                        <option value="scale">Scale (1–5)</option>
                      </select>
                    </div>
                    
                    {(q.type === "mcq" || q.type === "checkbox") && (
                      <div>
                        <Label className="block text-sm font-medium text-gray-700 mb-3">Options</Label>
                        <div className="space-y-3">
                          {q.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-3">
                              <Input
                                value={option}
                                placeholder={`Option ${optionIndex + 1}`}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const newOptions = [...q.options];
                                  newOptions[optionIndex] = e.target.value;
                                  handleQuestionChange(i, "options", newOptions);
                                }}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
                                  handleQuestionChange(i, "options", newOptions);
                                }}
                                className="text-xs px-3"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...q.options, ""];
                              handleQuestionChange(i, "options", newOptions);
                            }}
                            className="w-full"
                          >
                            + Add Option
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                
                {i < questions.length - 1 && (
                  <div className="h-px bg-gray-200 my-6"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {questions.length} question{questions.length !== 1 ? 's' : ''} • {title ? 'Ready to create' : 'Add a title to continue'}
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !title.trim()}
                className="px-8 py-2"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  "Create Form"
                )}
              </Button>
            </div>
          </div>
        </div>

        {result && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">Form Created Successfully!</h3>
                <p className="text-green-700 mt-1">Your form has been deployed and is ready to use.</p>
                <a 
                  href={result} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-3 text-green-600 hover:text-green-700 underline"
                >
                  View Form →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
