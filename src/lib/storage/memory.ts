// ============================
// src/lib/storage/memory.ts
// ============================

interface QuestionTurn {
  question: string;
  answer: string;
  rationale?: string;
  confidenceAfter?: number;
  type: 'text' | 'likert' | 'choice';
}

interface SessionState {
  id: string;
  createdAt: string;
  goal: string;
  goalConfirmed: boolean;
  turns: QuestionTurn[];
  finalSummary?: string;
  status: 'in-progress' | 'completed';
  userStopped?: boolean;
}

interface SessionDiff {
  addedTurns: number;
  modifiedGoal: boolean;
  statusChanged: boolean;
  summaryAdded: boolean;
}

/**
 * Local or session-based memory model
 * Stores session state and diffs for change tracking
 */

export function storeSessionState(session: SessionState): void {
  // Store in localStorage for persistence
  try {
    localStorage.setItem(`20q-session-${session.id}`, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to store session in localStorage:', error);
  }
}

export function computeSessionDiff(prev: SessionState, next: SessionState): SessionDiff {
  const diff: SessionDiff = {
    addedTurns: next.turns.length - prev.turns.length,
    modifiedGoal: prev.goal !== next.goal,
    statusChanged: prev.status !== next.status,
    summaryAdded: !prev.finalSummary && !!next.finalSummary
  };

  return diff;
}

export function loadSessionFromMemory(sessionId: string): SessionState | null {
  try {
    const stored = localStorage.getItem(`20q-session-${sessionId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return null;
  }
}
