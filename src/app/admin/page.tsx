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
    <div className="min-h-screen p-6 font-sans bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Create New Feedback Page</h1>
        <div className="mb-4">
          <Label>Title</Label>
          <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
        </div>
        <div className="mb-4">
          <Label className="flex items-center gap-2 mb-2">
            <Switch
              checked={expirationNever}
              onCheckedChange={setExpirationNever}
            />
            Never Expire
          </Label>
          {!expirationNever && (
            <div className="flex gap-2">
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
                className="border rounded px-3 py-2"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          )}
        </div>
        <div className="mb-4">
          <Label className="flex items-center gap-2">
            <Switch
              checked={enforceUnique}
              onCheckedChange={setEnforceUnique}
            />
            Enforce Unique by IP/Device
          </Label>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={i} className="p-4">
              <Label className="block mb-2">Question {i + 1}</Label>
              <Input
                className="mb-2"
                value={q.label}
                placeholder="Question text"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleQuestionChange(i, "label", e.target.value)
                }
              />
              <Label className="block mb-1">Type</Label>
              <select
                className="mb-2 w-full border p-2 rounded"
                value={q.type}
                onChange={(e) =>
                  handleQuestionChange(i, "type", e.target.value)
                }
              >
                <option value="text">Text</option>
                <option value="yesno">Yes/No</option>
                <option value="mcq">Multiple Choice</option>
                <option value="checkbox">Checkboxes</option>
                <option value="scale">Scale (1–5)</option>
              </select>
              {(q.type === "mcq" || q.type === "checkbox") && (
                <div className="mt-2">
                  <Label className="block mb-2">Options</Label>
                  <div className="space-y-2">
                    {q.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex gap-2">
                        <Input
                          value={option}
                          placeholder={`Option ${optionIndex + 1}`}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newOptions = [...q.options];
                            newOptions[optionIndex] = e.target.value;
                            handleQuestionChange(i, "options", newOptions);
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
                            handleQuestionChange(i, "options", newOptions);
                          }}
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
                    >
                      Add Option
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-4 flex gap-4">
          <Button onClick={handleAddQuestion} variant="secondary">
            Add Question
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Create Page"}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-4 bg-green-100 text-green-800 rounded">
            Deployed at: <a href={result}>{result}</a>
          </div>
        )}
      </div>
    </div>
  );
}
