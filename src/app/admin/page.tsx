// src/app/admin/page.tsx
'use client';
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface Question {
  id: string;
  type: string;
  label: string;
  options: string[];
  scaleRange?: number;
  skipLogic?: {
    enabled: boolean;
    dependsOn: string; // question ID this depends on
    condition: string; // "equals", "not_equals"
    value: string; // the value to compare against
  };
}

interface SortableQuestionProps {
  question: Question;
  index: number;
  questions: Question[];
  handleQuestionChange: (index: number, key: keyof Question, value: string | string[] | number | any) => void;
  onRemove: () => void;
}

function SortableQuestion({ question: q, index: i, questions, handleQuestionChange, onRemove }: SortableQuestionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Helper function to get conditions based on question type
  const getConditionsForType = (type: string) => {
    switch(type) {
      case "yesno":
        return [
          { value: "equals", label: "equals" },
          { value: "not_equals", label: "does not equal" }
        ];
      case "mcq":
      case "likert":
        return [
          { value: "equals", label: "equals" },
          { value: "not_equals", label: "does not equal" }
        ];
      case "checkbox":
        return [
          { value: "includes", label: "includes" },
          { value: "not_includes", label: "does not include" }
        ];
      case "scale":
        return [
          { value: "equals", label: "equals" },
          { value: "not_equals", label: "does not equal" },
          { value: "greater_than", label: "greater than" },
          { value: "less_than", label: "less than" }
        ];
      case "text":
        return [
          { value: "equals", label: "equals" },
          { value: "not_equals", label: "does not equal" },
          { value: "contains", label: "contains" },
          { value: "not_contains", label: "does not contain" }
        ];
      default:
        return [
          { value: "equals", label: "equals" },
          { value: "not_equals", label: "does not equal" }
        ];
    }
  };

  // Helper function to get values based on question type
  const getValuesForQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return [];

    switch(question.type) {
      case "yesno":
        return ["Yes", "No"];
      case "mcq":
      case "checkbox":
      case "likert":
        return question.options || [];
      case "scale":
        const range = question.scaleRange || 5;
        return Array.from({length: range}, (_, i) => (i + 1).toString());
      case "text":
        return []; // Text input - user types value
      default:
        return [];
    }
  };

  // Get the referenced question for skip logic
  const referencedQuestion = q.skipLogic?.enabled && q.skipLogic?.dependsOn 
    ? questions.find(question => question.id === q.skipLogic?.dependsOn)
    : null;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`p-6 border border-gray-200 shadow-sm ${
        q.type === "text" ? "bg-yellow-50" :
        q.type === "yesno" ? "bg-pink-50" :
        q.type === "mcq" ? "bg-blue-50" :
        q.type === "checkbox" ? "bg-green-50" :
        q.type === "scale" ? "bg-purple-50" :
        q.type === "likert" ? "bg-orange-50" :
        "bg-white"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
              title="Drag to reorder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800">Question {i + 1}</h3>
          </div>
          {questions.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="text-xs font-bold cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
              className="w-full bg-white"
            />
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Question Type</Label>
            <div className="relative">
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                value={q.type}
                onChange={(e) =>
                  handleQuestionChange(i, "type", e.target.value)
                }
              >
                <option value="text">Text Response</option>
                <option value="yesno">Yes/No</option>
                <option value="mcq">Multiple Choice</option>
                <option value="checkbox">Checkboxes</option>
                <option value="scale">Scale</option>
                <option value="likert">Likert</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
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
                      className="flex-1 bg-white"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
                        handleQuestionChange(i, "options", newOptions);
                      }}
                      className="text-xs px-3 font-bold cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const newOptions = [...q.options, ""];
                    handleQuestionChange(i, "options", newOptions);
                  }}
                  className={`w-full cursor-pointer ${
                    q.type === "checkbox" 
                      ? "bg-green-200 text-green-700 border-green-200 hover:bg-green-300" 
                      : "bg-blue-200 text-blue-700 border-blue-200 hover:bg-blue-300"
                  }`}
                >
                  + Add Option
                </Button>
              </div>
            </div>
          )}
          
          {q.type === "scale" && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Scale Range</Label>
              <div className="relative">
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  value={q.scaleRange || 5}
                  onChange={(e) =>
                    handleQuestionChange(i, "scaleRange", parseInt(e.target.value))
                  }
                >
                  <option value={5}>1-5</option>
                  <option value={10}>1-10</option>
                  <option value={100}>1-100</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {q.type === "likert" && (
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-3">Likert Scale Options</Label>
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
                      className="flex-1 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip Logic - moved after options for MCQ, checkbox, scale, and Likert */}
          {i > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-3">
                <Switch
                  checked={q.skipLogic?.enabled || false}
                  onCheckedChange={(enabled: boolean) => {
                    console.log('Toggle clicked:', enabled); // Debug log
                    const skipLogic = enabled 
                      ? { enabled: true, dependsOn: questions[0].id, condition: "equals", value: "" }
                      : { enabled: false, dependsOn: "", condition: "equals", value: "" };
                    handleQuestionChange(i, "skipLogic", skipLogic);
                  }}
                />
                <Label className="text-sm font-medium text-gray-700 cursor-pointer" onClick={() => {
                  const enabled = !(q.skipLogic?.enabled || false);
                  const skipLogic = enabled 
                    ? { enabled: true, dependsOn: questions[0].id, condition: "equals", value: "" }
                    : { enabled: false, dependsOn: "", condition: "equals", value: "" };
                  handleQuestionChange(i, "skipLogic", skipLogic);
                }}>
                  Show only if...
                </Label>
              </div>
              
              {q.skipLogic?.enabled && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Question</Label>
                    <div className="relative">
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        value={q.skipLogic?.dependsOn || ""}
                        onChange={(e) => {
                          const skipLogic = { ...q.skipLogic!, dependsOn: e.target.value };
                          handleQuestionChange(i, "skipLogic", skipLogic);
                        }}
                      >
                        {questions.slice(0, i).map((prevQ, idx) => (
                          <option key={prevQ.id} value={prevQ.id}>
                            Q{idx + 1}: {prevQ.label || "Untitled"}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-500">Condition</Label>
                    <div className="relative">
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                        value={q.skipLogic?.condition || "equals"}
                        onChange={(e) => {
                          const skipLogic = { ...q.skipLogic!, condition: e.target.value };
                          handleQuestionChange(i, "skipLogic", skipLogic);
                        }}
                      >
                        {getConditionsForType(referencedQuestion?.type || "text").map((cond) => (
                          <option key={cond.value} value={cond.value}>
                            {cond.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-500">Value</Label>
                    {referencedQuestion?.type === "text" ? (
                      <Input
                        value={q.skipLogic?.value || ""}
                        placeholder="Enter text value..."
                        onChange={(e) => {
                          const skipLogic = { ...q.skipLogic!, value: e.target.value };
                          handleQuestionChange(i, "skipLogic", skipLogic);
                        }}
                        className="text-sm bg-white"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                          value={q.skipLogic?.value || ""}
                          onChange={(e) => {
                            const skipLogic = { ...q.skipLogic!, value: e.target.value };
                            handleQuestionChange(i, "skipLogic", skipLogic);
                          }}
                          disabled={!referencedQuestion}
                        >
                          <option value="">Select value...</option>
                          {getValuesForQuestion(q.skipLogic?.dependsOn || "").map((val) => (
                            <option key={val} value={val}>
                              {val}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
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
    { id: 'q1', type: "yesno", label: "", options: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD; 

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Auto-disable skip logic for questions that reference questions that are no longer available
        reorderedItems.forEach((q, qIndex) => {
          if (q.skipLogic?.enabled && q.skipLogic?.dependsOn) {
            const referencedQuestionIndex = reorderedItems.findIndex(item => item.id === q.skipLogic?.dependsOn);
            if (referencedQuestionIndex === -1 || referencedQuestionIndex >= qIndex) {
              // Referenced question doesn't exist or is after this question
              reorderedItems[qIndex].skipLogic = { enabled: false, dependsOn: "", condition: "equals", value: "" };
            }
          }
        });
        
        return reorderedItems;
      });
    }
  }

  function handleLogin() {
    if (auth === PASSWORD) setAuthenticated(true);
  }

  function handleAddQuestion() {
    const newId = `q${Date.now()}`;
    setQuestions([...questions, { id: newId, type: "text", label: "", options: [] }]);
  }

  function handleQuestionChange(index: number, key: keyof Question, value: string | string[] | number | any) {
    const updated = [...questions];
    if (key === "type") {
      updated[index].type = value as string;
      if (value !== "mcq" && value !== "checkbox" && value !== "likert") {
        updated[index].options = [];
      }
      if (value === "scale") {
        updated[index].scaleRange = 5; // Default to 1-5
      } else {
        updated[index].scaleRange = undefined;
      }
      if (value === "likert") {
        updated[index].options = [
          "Strongly agree",
          "Somewhat agree", 
          "Neither agree nor disagree",
          "Somewhat disagree",
          "Strongly disagree"
        ];
      }
      
      // Auto-disable skip logic for questions that reference this question
      updated.forEach((q, qIndex) => {
        if (q.skipLogic?.enabled && q.skipLogic?.dependsOn === updated[index].id) {
          updated[qIndex].skipLogic = { enabled: false, dependsOn: "", condition: "equals", value: "" };
        }
      });
    } else if (key === "label") {
      updated[index].label = value as string;
    } else if (key === "options") {
      updated[index].options = value as string[];
      
      // Auto-disable skip logic for questions that reference this question
      updated.forEach((q, qIndex) => {
        if (q.skipLogic?.enabled && q.skipLogic?.dependsOn === updated[index].id) {
          updated[qIndex].skipLogic = { enabled: false, dependsOn: "", condition: "equals", value: "" };
        }
      });
    } else if (key === "scaleRange") {
      updated[index].scaleRange = value as number;
      
      // Auto-disable skip logic for questions that reference this question
      updated.forEach((q, qIndex) => {
        if (q.skipLogic?.enabled && q.skipLogic?.dependsOn === updated[index].id) {
          updated[qIndex].skipLogic = { enabled: false, dependsOn: "", condition: "equals", value: "" };
        }
      });
    } else if (key === "skipLogic") {
      updated[index].skipLogic = value;
    }
    setQuestions(updated);
  }

  async function handleSubmit() {
    setSubmitting(true);
    
    // Build expiration string
    let expiration = "";
    if (!expirationNever) {
      if (expirationUnit === "minutes") {
        expiration = `${expirationValue}m`;
      } else if (expirationUnit === "hours") {
        expiration = `${expirationValue}h`;
      } else if (expirationUnit === "days") {
        expiration = `${expirationValue}d`;
      }
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
                  <div className="relative">
                                      <select
                    value={expirationUnit}
                    onChange={(e) => setExpirationUnit(e.target.value)}
                    className="border rounded px-3 py-2 pr-8 text-sm appearance-none bg-white"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
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
            <Button onClick={handleAddQuestion} className="bg-blue-200 text-blue-700 border-blue-200 hover:bg-blue-700 cursor-pointer" size="sm">
              + Add Question
            </Button>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-6">
                {questions.map((q, i) => (
                  <SortableQuestion
                    key={q.id}
                    question={q}
                    index={i}
                    questions={questions}
                    handleQuestionChange={handleQuestionChange}
                    onRemove={() => {
                      const newQuestions = questions.filter((_, idx) => idx !== i);
                      setQuestions(newQuestions);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {questions.length} question{questions.length !== 1 ? 's' : ''} • {
                !title.trim() ? (
                  <span className="text-red-600">Add a title to continue</span>
                ) : questions.some(q => !q.label.trim()) ? (
                  <span className="text-red-600">Add question text to continue</span>
                ) : (
                  <span className="text-green-600">Ready to create</span>
                )
              }
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !title.trim() || questions.some(q => !q.label.trim())}
                className="px-8 py-2 bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
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
                <div className="flex items-center gap-2 mt-3">
                  <a 
                    href={result} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 underline cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(result, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    View Form
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(result);
                        // Optional: Show a brief success message
                        const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
                        if (button) {
                          const originalHTML = button.innerHTML;
                          button.innerHTML = `
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          `;
                          setTimeout(() => {
                            button.innerHTML = originalHTML;
                          }, 1000);
                        }
                      } catch (err) {
                        console.error('Failed to copy link:', err);
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-green-600 transition-colors cursor-pointer"
                    data-copy-button
                    title="Copy link to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
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
