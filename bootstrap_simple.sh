#!/bin/bash

set -euo pipefail

BASE="/Users/nathanramia/Documents/Code/questions"

write_file() {
  local path="$1"
  local content="$2"
  mkdir -p "$(dirname "$BASE/$path")"
  echo "$content" > "$BASE/$path"
}

# Main 20Q page
write_file "src/app/20q/page.tsx" '// ============================
// src/app/20q/page.tsx
// ============================

/**
 * This is the entry point to the 20 Questions experience.
 * It renders the sequential UI of question cards during goal definition.
 * 
 * Once the goal is confirmed (via agent confidence or user agreement),
 * the session transitions to the interactive Q&A phase.
 *
 * The design follows a form UX model - NOT chat. Each turn appears
 * as a new card in a vertical sequence. 
 * 
 * This page initializes a new session, renders questions iteratively,
 * and passes state into the agent controller to get next question + rationale.
 */

export default function TwentyQuestionsPage() {
  // TODO:
  // - Start a new session state (SessionProvider)
  // - Render a stack of QuestionCards (form-style, vertical)
  // - Capture user input for each card
  // - Call agent API to get next question
  // - Show summary once session ends
  return null;
}'

# Session view page
write_file "src/app/20q/session/[id]/page.tsx" '// ============================
// src/app/20q/session/[id]/page.tsx
// ============================

/**
 * Displays a previously completed 20Q session.
 * Pulls the session data by ID, loads question/answer pairs,
 * and renders them in read-only stacked question box form.
 * Also includes final summary.
 */

export default function CompletedSessionPage({ params }: { params: { id: string } }) {
  // TODO:
  // - Fetch session data by ID (from Drive or local cache)
  // - Display question/answer pairs as readonly cards
  // - Display final summary at the end
  return null;
}'

# Generate question API
write_file "src/app/api/20q/generate-question/route.ts" '// ============================
// src/app/api/20q/generate-question/route.ts
// ============================

/**
 * API Route that takes in:
 * - prior turns (question/answer pairs)
 * - current goal
 * - agent config (e.g. confidence threshold)
 *
 * Returns:
 * - next question
 * - agent rationale for asking it
 * - updated confidence score
 * - question type (text, likert, etc)
 */

export async function POST(req: Request) {
  // TODO:
  // - Validate session state payload
  // - Use OpenAI or Claude to generate next question
  // - Return next turn block
  return new Response(null);
}'

# Save session API
write_file "src/app/api/20q/save-session/route.ts" '// ============================
// src/app/api/20q/save-session/route.ts
// ============================

/**
 * Saves the full session state to Google Drive.
 * This includes:
 * - questions/answers
 * - goal definition
 * - rationale per question
 * - confidence per turn
 * - final summary
 */

export async function POST(req: Request) {
  // TODO:
  // - Receive complete session JSON
  // - Use Google Drive API to write .json + .txt summary file
  return new Response(null);
}'

# Notify API
write_file "src/app/api/20q/notify/route.ts" '// ============================
// src/app/api/20q/notify/route.ts
// ============================

/**
 * Sends a Telegram notification using the bot token + chat ID.
 * Used both for:
 * - nudging user to complete a session
 * - sending final summary after completion
 */

export async function POST(req: Request) {
  // TODO:
  // - Parse message payload
  // - Call Telegram Bot API via fetch
  return new Response(null);
}'

# Schedule nudge API
write_file "src/app/api/20q/schedule-nudge/route.ts" '// ============================
// src/app/api/20q/schedule-nudge/route.ts
// ============================

/**
 * Evaluates upcoming Google Calendar events + session cadence
 * to determine whether now is a good time to nudge user.
 *
 * Called on cron, or after session ends.
 * If appropriate, triggers /notify endpoint.
 */

export async function POST(req: Request) {
  // TODO:
  // - Pull calendar events via Google API (lib/calendar.ts)
  // - Send context to LLM with prompt template (lib/agent.ts)
  // - If approved, trigger /notify with payload
  return new Response(null);
}'

# Components
write_file "src/components/20q/QuestionCard.tsx" '// ============================
// src/components/20q/QuestionCard.tsx
// ============================

/**
 * Displays a single question as a form input.
 * - Text area for text questions
 * - Radio group or slider for likert/scale
 *
 * Props:
 * - question text
 * - onSubmit(answer)
 * - optional rationale display
 */

export function QuestionCard() {
  // TODO:
  // - Render question text
  // - Show input field(s) based on question type
  // - Submit handler for answer
  return null;
}'

write_file "src/components/20q/SessionSummary.tsx" '// ============================
// src/components/20q/SessionSummary.tsx
// ============================

/**
 * Displays a completed session summary:
 * - Goal statement
 * - Final LLM-generated summary
 * - Confidence achieved
 */

export function SessionSummary() {
  // TODO:
  // - Render props or sessionContext summary block
  return null;
}'

write_file "src/components/20q/WhyThisQuestion.tsx" '// ============================
// src/components/20q/WhyThisQuestion.tsx
// ============================

/**
 * Popover/modal triggered by "Why this question?" button
 * Shows rationale provided by the agent for this turn.
 */

export function WhyThisQuestion() {
  // TODO:
  // - Toggleable UI element
  // - Renders agent rationale from props
  return null;
}'

# Lib files
write_file "src/lib/20q/agent.ts" '// ============================
// src/lib/20q/agent.ts
// ============================

/**
 * Contains agent logic (MCP) that:
 * - Receives session state
 * - Builds prompt
 * - Calls LLM
 * - Returns next question, rationale, confidence
 * - Can be used both client-side and in API
 */

export async function generateNextTurn() {
  // TODO:
  // - Build prompt from goal + past turns
  // - Hit LLM
  // - Parse + return structured response
}'

write_file "src/lib/20q/prompts.ts" '// ============================
// src/lib/20q/prompts.ts
// ============================

/**
 * Centralized system prompts used for:
 * - Goal definition
 * - Q&A turn generation
 * - Summary generation
 * - Calendar-based nudging
 */

export const PROMPTS = {
  goalDefinition: "...",
  generateTurn: "...",
  summarizeSession: "...",
  calendarNudge: "..."
};'

write_file "src/lib/20q/summarizer.ts" '// ============================
// src/lib/20q/summarizer.ts
// ============================

/**
 * Takes a completed session object, and returns:
 * - High-level summary string (GPT or Claude)
 * - Delta/change detection from prior sessions (optional)
 */

export async function summarizeSession(session: any) {
  // TODO:
  // - Generate summary from full session
  // - Optionally compute diff with last session state
  return {
    summary: "",
    diff: ""
  };
}'

write_file "src/lib/20q/calendar.ts" '// ============================
// src/lib/20q/calendar.ts
// ============================

/**
 * Pulls upcoming Google Calendar events (1-3 day horizon).
 * Structures events semantically for the MCP agent.
 */

export async function getUpcomingEvents() {
  // TODO:
  // - Authenticate with Google Calendar
  // - Format events with readable descriptors
  return [];
}'

write_file "src/lib/20q/telegram.ts" '// ============================
// src/lib/20q/telegram.ts
// ============================

/**
 * Wraps Telegram Bot API interactions
 * Used by notification functions to deliver user pings
 */

export async function sendTelegramMessage(message: string) {
  // TODO:
  // - Use fetch to hit Telegram Bot API
  return true;
}'

# Storage files
write_file "src/lib/storage/drive.ts" '// ============================
// src/lib/storage/drive.ts
// ============================

/**
 * Google Drive writer utility
 * Saves:
 * - session .json file
 * - session summary .txt file
 */

export async function writeSessionToDrive(session: any) {
  // TODO:
  // - Authenticate with Google API
  // - Write both formats to Drive folder
  return true;
}'

write_file "src/lib/storage/memory.ts" '// ============================
// src/lib/storage/memory.ts
// ============================

/**
 * Local or session-based memory model
 * Stores session state and diffs for change tracking
 */

export function storeSessionState(session: any) {
  // TODO:
  // - Save session locally or push to API
}

export function computeSessionDiff(prev: any, next: any) {
  // TODO:
  // - Use jsondiffpatch or similar
  return {};
}'

echo "✅ All 20Q files created at $BASE" 