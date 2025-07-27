// src/app/create/page.tsx
'use client';
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { useDarkMode } from "@/lib/dark-mode";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
// QR Code will be generated using qrcode-svg in browser

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

interface FormData {
  formId?: string;
  title: string;
  description?: string;
  questions: Question[];
  enforceUnique?: boolean;
  expires_at?: string;
}

interface SortableQuestionProps {
  question: Question;
  index: number;
  questions: Question[];
  handleQuestionChange: (index: number, key: keyof Question, value: string | string[] | number | Question['skipLogic']) => void;
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
      <Card className={`p-4 sm:p-6 border border-gray-200 shadow-sm ${
        q.type === "text" ? "bg-yellow-50" :
        q.type === "yesno" ? "bg-pink-50" :
        q.type === "mcq" ? "bg-blue-50" :
        q.type === "checkbox" ? "bg-green-50" :
        q.type === "scale" ? "bg-purple-50" :
        q.type === "likert" ? "bg-orange-50" :
        "bg-white"
      }`} style={{ opacity: 1, filter: 'none' }}>
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
              className="w-full !bg-white !border-gray-300 !text-gray-900"
            />
            {q.label.length >= 190 && (
              <div className={`text-sm mt-1 ${
                q.label.length > 200 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {q.label.length}/200
              </div>
            )}
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Question Type</Label>
            <div className="relative">
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none !bg-white !text-gray-900"
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
                    <div className="flex-1">
                      <Input
                        value={option}
                        placeholder={`Option ${optionIndex + 1}`}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const newOptions = [...q.options];
                          newOptions[optionIndex] = e.target.value;
                          handleQuestionChange(i, "options", newOptions);
                        }}
                        className="w-full !bg-white !border-gray-300 !text-gray-900"
                      />
                      {option.length >= 90 && (
                        <div className={`text-sm mt-1 ${
                          option.length > 100 ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {option.length}/100
                        </div>
                      )}
                    </div>
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none !bg-white !text-gray-900"
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
                    <div className="flex-1">
                      <Input
                        value={option}
                        placeholder={`Option ${optionIndex + 1}`}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const newOptions = [...q.options];
                          newOptions[optionIndex] = e.target.value;
                          handleQuestionChange(i, "options", newOptions);
                        }}
                        className="w-full !bg-white !border-gray-300 !text-gray-900"
                      />
                      {option.length >= 90 && (
                        <div className={`text-sm mt-1 ${
                          option.length > 100 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {option.length}/100
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skip Logic - moved after options for MCQ, checkbox, scale, and Likert */}
          {i > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-4">
                <Switch
                  checked={q.skipLogic?.enabled || false}
                  onCheckedChange={(enabled: boolean) => {
                    console.log('Toggle clicked:', enabled); // Debug log
                    const skipLogic = enabled 
                      ? { enabled: true, dependsOn: questions[0].id, condition: "equals", value: "" }
                      : { enabled: false, dependsOn: "", condition: "equals", value: "" };
                    handleQuestionChange(i, "skipLogic", skipLogic);
                  }}
                  className="!bg-gray-300 !data-[state=checked]:!bg-blue-700 !data-[state=unchecked]:!bg-gray-400"
                  thumbClassName="!bg-white"
                />
                <Label className="block text-sm font-medium text-gray-700 cursor-pointer" onClick={() => {
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
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Question</Label>
                    <div className="relative">
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none !bg-white !text-gray-900"
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
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Condition</Label>
                    <div className="relative">
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none !bg-white !text-gray-900"
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
                    <Label className="block text-sm font-medium text-gray-700 mb-2">Value</Label>
                    {referencedQuestion?.type === "text" ? (
                      <Input
                        value={q.skipLogic?.value || ""}
                        placeholder="Enter text value..."
                        onChange={(e) => {
                          const skipLogic = { ...q.skipLogic!, value: e.target.value };
                          handleQuestionChange(i, "skipLogic", skipLogic);
                        }}
                        className="text-sm !bg-white !border-gray-300 !text-gray-900"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none !bg-white !text-gray-900"
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
  const [countdown, setCountdown] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState("");
  const [editingFormId, setEditingFormId] = useState<string | null>(null); // Track if we're editing
  
  // Title validation state
  const [titleValidation, setTitleValidation] = useState<{
    isValidating: boolean;
    isDuplicate: boolean;
    error: string;
  }>({
    isValidating: false,
    isDuplicate: false,
    error: ""
  });
  const [titleValidationTimeout, setTitleValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  const { isDark } = useDarkMode();

  // Check for existing authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
      setAuthenticated(true);
    }
  }, []);

  // Debounced title validation
  const validateTitle = async (titleToValidate: string) => {
    if (!titleToValidate.trim()) {
      setTitleValidation({
        isValidating: false,
        isDuplicate: false,
        error: ""
      });
      return;
    }

    setTitleValidation(prev => ({ ...prev, isValidating: true }));

    try {
      const response = await fetch('/api/forms/check-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: titleToValidate,
          excludeFormId: editingFormId // Exclude current form when editing
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitleValidation({
          isValidating: false,
          isDuplicate: data.isDuplicate,
          error: data.isDuplicate ? data.message : ""
        });
      } else {
        setTitleValidation({
          isValidating: false,
          isDuplicate: false,
          error: data.error || "Failed to validate title"
        });
      }
    } catch (error) {
      setTitleValidation({
        isValidating: false,
        isDuplicate: false,
        error: "Network error while validating title"
      });
    }
  };

  // Handle title changes with debouncing
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    
    // Clear existing timeout
    if (titleValidationTimeout) {
      clearTimeout(titleValidationTimeout);
    }
    
    // Clear validation state immediately
    setTitleValidation({
      isValidating: false,
      isDuplicate: false,
      error: ""
    });
    
    // Set new timeout for validation
    const timeout = setTimeout(() => {
      validateTitle(newTitle);
    }, 1000); // 1 second debounce
    
    setTitleValidationTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (titleValidationTimeout) {
        clearTimeout(titleValidationTimeout);
      }
    };
  }, [titleValidationTimeout]);

  // Function to download QR code as PNG
  const downloadQRCode = () => {
    if (!qrCodeData || !result) return;
    
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
        link.download = `qrcode-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    
    // Convert SVG to data URL
    const svgBlob = new Blob([qrCodeData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  }; 

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (result && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [result, countdown]);

  // Reset countdown when editing starts
  useEffect(() => {
    if (editingFormId) {
      setCountdown(0);
      setResult("");
      setQRCodeData("");
    }
  }, [editingFormId]);

  // Handle duplicate URL parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const duplicateData = urlParams.get('duplicate');
      const editData = urlParams.get('edit');
      
      if (duplicateData) {
        try {
          const formData: FormData = JSON.parse(decodeURIComponent(duplicateData));
          
          // Pre-populate the form with the duplicated data
          setTitle(formData.title || "");
          setDescription(formData.description || "");
          setEnforceUnique(formData.enforceUnique !== undefined ? formData.enforceUnique : true);
          
          // Pre-populate questions if they exist
          if (formData.questions && Array.isArray(formData.questions)) {
            // Generate new IDs for all questions to avoid conflicts
            const questionsWithNewIds = formData.questions.map((q: Question, index: number) => ({
              ...q,
              id: `q${Date.now()}_${index}`,
            }));
            setQuestions(questionsWithNewIds);
          }
          
          // Clear the URL parameter
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
        } catch (error) {
          console.error('Error parsing duplicate data:', error);
        }
      } else if (editData) {
        try {
          const formData: FormData = JSON.parse(decodeURIComponent(editData));
          
          // Set editing mode
          setEditingFormId(formData.formId ? formData.formId : null);
          
          // Pre-populate the form with the existing data
          setTitle(formData.title || "");
          setDescription(formData.description || "");
          setEnforceUnique(formData.enforceUnique !== undefined ? formData.enforceUnique : true);
          
          // Handle expiration
          if (formData.expires_at) {
            setExpirationNever(false);
            // Parse the expiration date and set appropriate values
            const expirationDate = new Date(formData.expires_at);
            const now = new Date();
            const diffMs = expirationDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.ceil(diffMs / (1000 * 60));
            
            if (diffDays > 1) {
              setExpirationUnit("days");
              setExpirationValue(diffDays.toString());
            } else if (diffHours > 1) {
              setExpirationUnit("hours");
              setExpirationValue(diffHours.toString());
            } else {
              setExpirationUnit("minutes");
              setExpirationValue(diffMinutes.toString());
            }
          } else {
            setExpirationNever(true);
          }
          
          // Pre-populate questions if they exist
          if (formData.questions && Array.isArray(formData.questions)) {
            console.log('Loading questions for edit:', formData.questions);
            // Ensure all questions have the required properties
            const normalizedQuestions = formData.questions.map((q: Question) => ({
              id: q.id || `q${Date.now()}`,
              type: q.type || "text",
              label: q.label || "",
              options: q.options || [],
              scaleRange: q.scaleRange,
              skipLogic: q.skipLogic
            }));
            setQuestions(normalizedQuestions);
          }
          
          // Clear the URL parameter
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
        } catch (error) {
          console.error('Error parsing edit data:', error);
        }
      }
    }
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id && over) {
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
    if (auth === PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
    }
  }

  function handleAddQuestion() {
    const newId = `q${Date.now()}`;
    setQuestions([...questions, { id: newId, type: "text", label: "", options: [] }]);
  }

  function handleQuestionChange(
    index: number, 
    key: keyof Question, 
    value: string | string[] | number | Question['skipLogic']
  ) {
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
      if (typeof value === 'object' && value !== null && 'enabled' in value) {
        updated[index].skipLogic = value as Question['skipLogic'];
      }
    }
    setQuestions(updated);
  }

  async function handleSubmit() {
    // Prevent submission if title is duplicate or validation is in progress
    if (titleValidation.isDuplicate || titleValidation.isValidating) {
      return;
    }
    
    // Prevent submission if title is empty
    if (!title.trim()) {
      return;
    }
    
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
      darkMode: isDark, // Include the current dark mode setting
    };
  
    try {
      let res;
      let data;
      
      if (editingFormId) {
        // Update existing form
        res = await fetch(`/api/forms/${editingFormId}/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        
        data = await res.json();
        if (res.ok && data.formUrl) {
          setResult(data.formUrl);
          setCountdown(60); // Start 60 second countdown
          
          // Generate QR code SVG
          try {
            const QRCode = (await import('qrcode-svg')).default;
            const qr = new QRCode({
              content: data.formUrl,
              padding: 4,
              width: 256,
              height: 256,
              color: "#000000",
              background: "#ffffff",
              ecl: "M"
            });
            setQRCodeData(qr.svg());
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
          
          // Auto-scroll to bottom after a brief delay to ensure the modal is rendered
          setTimeout(() => {
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        } else {
          throw new Error("API call failed");
        }
      } else {
        // Create new form
        res = await fetch("/api/create-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
  
        data = await res.json();
      if (res.ok && data.link) {
        setResult(data.link);
          setCountdown(60); // Start 60 second countdown
          
          // Generate QR code SVG
          try {
            const QRCode = (await import('qrcode-svg')).default;
            const qr = new QRCode({
              content: data.link,
              padding: 4,
              width: 256,
              height: 256,
              color: "#000000",
              background: "#ffffff",
              ecl: "M"
            });
            setQRCodeData(qr.svg());
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
          
          // Auto-scroll to bottom after a brief delay to ensure the modal is rendered
          setTimeout(() => {
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
      } else {
        throw new Error("API call failed");
        }
      }
    } catch (e) {
      console.error(e);
      setResult(editingFormId ? "Error updating form" : "Error creating form");
    }
  
    setSubmitting(false);
  }

  // Check if any character limits are exceeded
  const isCharacterLimitExceeded = () => {
    // Check title limit
    if (title.length > 50) return true;
    
    // Check description limit
    if (description.length > 750) return true;
    
    // Check question text and options limits
    for (const q of questions) {
      if (q.label.length > 200) return true;
      
      // Check options for MCQ, checkbox, and Likert questions
      if (['mcq', 'checkbox', 'likert'].includes(q.type)) {
        for (const option of q.options) {
          if (option.length > 100) return true;
        }
      }
    }
    
    return false;
  };

  // Check if form is ready to publish
  const isFormReady = () => {
    return (
      title.trim() !== "" &&
      questions.length > 0 &&
      questions.every(q => q.label.trim() !== "") &&
      !titleValidation.isDuplicate &&
      !titleValidation.isValidating &&
      !isCharacterLimitExceeded()
    );
  };

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
    <div className="min-h-screen px-4 sm:px-8 pt-12 pb-24 font-sans bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {editingFormId ? `Edit Form (${editingFormId})` : "Create New Form"}
          </h1>
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
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="cursor-pointer"
            >
              Dashboard
            </Button>
          </div>
        </div>
        
        {/* Form Configuration Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Form Details</h2>
            <Button
              onClick={handleSubmit}
              disabled={!isFormReady() || submitting}
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {editingFormId ? "Updating..." : "Creating..."}
                </div>
              ) : (
                editingFormId ? "Update Form" : "Publish Form"
              )}
            </Button>
          </div>
          
          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</Label>
              <Input
                value={title} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTitleChange(e.target.value)}
                className={`w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  titleValidation.isDuplicate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder="Enter form title..."
              />
              {title.length >= 40 && (
                <div className={`text-sm mt-1 ${
                  title.length > 50 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {title.length}/50
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                {titleValidation.isValidating && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Checking title availability...
                  </div>
                )}
                {titleValidation.isDuplicate && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {titleValidation.error}
                  </div>
                )}
                {!titleValidation.isValidating && !titleValidation.isDuplicate && title.trim() && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Title is available
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</Label>
              <Textarea 
                value={description} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Add a description or instructions for respondents?"
                className="min-h-[100px] w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {description.length >= 740 && (
                <div className={`text-sm mt-1 ${
                  description.length > 750 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {description.length}/750
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Form Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  checked={expirationNever}
                  onCheckedChange={setExpirationNever}
                  className="dark:data-[state=checked]:bg-gray-900 dark:data-[state=unchecked]:bg-gray-400"
                  thumbClassName="!bg-white"
                />
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Never Expire</Label>
              </div>
              {!expirationNever && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Expires in:</span>
                  <Input
                    type="number"
                    min="1"
                    value={expirationValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpirationValue(e.target.value)}
                    className="w-20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <div className="relative">
                                      <select
                    value={expirationUnit}
                    onChange={(e) => setExpirationUnit(e.target.value)}
                    className="border rounded px-3 py-2 pr-8 text-sm appearance-none bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
            <Switch
              checked={enforceUnique}
              onCheckedChange={setEnforceUnique}
              className="dark:data-[state=checked]:bg-gray-900 dark:data-[state=unchecked]:bg-gray-400"
              thumbClassName="!bg-white"
            />
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enforce Unique by IP/Device</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Questions</h2>
            <Button onClick={handleAddQuestion} className="bg-blue-200 text-blue-700 border-blue-200 hover:bg-blue-300 cursor-pointer" size="sm">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {questions.length} question{questions.length !== 1 ? 's' : ''} • {
                submitting 
                  ? "Submitting..." 
                  : isCharacterLimitExceeded() 
                    ? <span className="text-red-600 dark:text-red-400">Character limits exceeded.</span>
                    : isFormReady() 
                      ? <span className="text-green-600 dark:text-green-400">Ready to create</span>
                      : <span className="text-red-600 dark:text-red-400">Please fill in all required fields</span>
              }
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormReady() || submitting}
                className={`px-8 py-2 text-white cursor-pointer ${
                  !isFormReady() || submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {editingFormId ? "Updating..." : "Creating..."}
                  </div>
                ) : (
                  editingFormId ? "Update Form" : "Publish Form"
                )}
              </Button>
            </div>
          </div>
        </div>

        {result && (
          <div className="mt-6 p-6 bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-500 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-400">Form Published Successfully!</h3>
                  <p className="text-green-700 dark:text-green-400 mt-1">Your form has been published; it may take a moment for it to become available.</p>
                </div>
              </div>
              
              {/* Action buttons on the right */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(result, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Form
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result);
                      // Optional: Show a brief success message
                      const button = document.querySelector('[data-copy-button]') as HTMLButtonElement;
                      if (button) {
                        const originalHTML = button.innerHTML;
                        button.innerHTML = `
                          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
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
                  className="p-2 text-gray-500 dark:text-white hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-md transition-colors cursor-pointer"
                  data-copy-button
                  title="Copy link to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Countdown Timer and QR Code */}
            <div className="mt-4 flex items-start gap-4">
              {/* Countdown Timer */}
              {countdown > 0 && (
                <div className="flex-1 rounded-md bg-blue-100 dark:bg-blue-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Form will be ready in about</span>
                  </div>
                  <span className="text-blue-900 dark:text-blue-100 font-bold tracking-wide">{countdown}s</span>
                </div>
              )}
              
              {countdown === 0 && (
                <div className="flex-1 rounded-md bg-green-100 dark:bg-green-900 px-4 py-3 flex items-center gap-2 text-green-700 dark:text-green-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">Form should now be ready to use!</span>
                </div>
              )}
              
              {/* QR Code and Download Button */}
              {qrCodeData && (
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div 
                    className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity bg-white dark:bg-gray-800 p-1 rounded border dark:border-gray-600 flex items-center justify-center"
                    onClick={() => setShowQRModal(true)}
                    title="Click to view QR code"
                  >
                    <svg className="w-8 h-8 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <button
                    onClick={downloadQRCode}
                    className="p-2 text-gray-500 dark:text-white hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-md transition-colors cursor-pointer"
                    title="Download QR code"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* QR Code Expanded Modal */}
        {showQRModal && qrCodeData && (
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
                    dangerouslySetInnerHTML={{ __html: qrCodeData }}
                  />
                </div>
                
                <p className="text-sm text-gray-600 text-center mb-6">
                  Scan this QR code to open the form directly
                </p>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={downloadQRCode}
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
