import { google } from 'googleapis';

interface QuestionTurn {
  question: string;
  answer: string;
  rationale?: string;
  confidenceAfter?: number;
  type: 'text' | 'likert' | 'choice';
}

interface SessionData {
  id: string;
  createdAt: string;
  goal: string;
  goalConfirmed: boolean;
  turns: QuestionTurn[];
  finalSummary?: string;
  status: 'in-progress' | 'completed';
  userStopped?: boolean;
  savedAt: string;
  accountContext?: 'personal' | 'work'; // Track which account was used
}

interface GoogleAccountConfig {
  serviceAccountEmail: string;
  privateKey: string;
  driveFolderId: string;
  calendarId: string;
  accountType: 'personal' | 'work';
}

// Initialize Google Drive API with specific account
function getDriveClient(accountConfig: GoogleAccountConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: accountConfig.serviceAccountEmail,
      private_key: accountConfig.privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

// Get account configuration based on context
function getAccountConfig(context: 'personal' | 'work'): GoogleAccountConfig {
  if (context === 'personal') {
    return {
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL_PERSONAL!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY_PERSONAL!,
      driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID_PERSONAL!,
      calendarId: process.env.GOOGLE_CALENDAR_ID_PERSONAL!,
      accountType: 'personal'
    };
  } else {
    return {
      serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL_WORK!,
      privateKey: process.env.GOOGLE_PRIVATE_KEY_WORK!,
      driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID_WORK!,
      calendarId: process.env.GOOGLE_CALENDAR_ID_WORK!,
      accountType: 'work'
    };
  }
}

// Determine account context based on session content
export function determineAccountContext(session: SessionData): 'personal' | 'work' {
  const goal = session.goal.toLowerCase();
  const answers = session.turns.map(turn => turn.answer.toLowerCase()).join(' ');
  const allText = `${goal} ${answers}`;

  // Work-related keywords
  const workKeywords = [
    'work', 'job', 'career', 'office', 'meeting', 'project', 'team', 'colleague',
    'boss', 'manager', 'client', 'business', 'company', 'professional', 'workplace',
    'deadline', 'presentation', 'budget', 'strategy', 'management', 'leadership'
  ];

  // Personal-related keywords
  const personalKeywords = [
    'personal', 'family', 'home', 'life', 'relationship', 'health', 'fitness',
    'hobby', 'travel', 'vacation', 'friend', 'partner', 'child', 'daughter', 'parents',
    'house', 'therapy', 'personal goal', 'growth', 'happiness'
  ];

  const workScore = workKeywords.filter(keyword => allText.includes(keyword)).length;
  const personalScore = personalKeywords.filter(keyword => allText.includes(keyword)).length;

  // If work score is significantly higher, use work account
  if (workScore > personalScore + 1) {
    return 'work';
  }
  
  // Default to personal for ambiguous cases
  return 'personal';
}

export async function writeSessionToDrive(session: SessionData): Promise<boolean> {
  try {
    // Determine which account to use
    const accountContext = session.accountContext || determineAccountContext(session);
    const accountConfig = getAccountConfig(accountContext);
    
    const drive = getDriveClient(accountConfig);

    // Create JSON file with full session data
    const sessionWithContext = {
      ...session,
      accountContext // Store which account was used
    };

    const jsonContent = JSON.stringify(sessionWithContext, null, 2);
    const jsonMetadata = {
      name: `20q-session-${session.id}.json`,
      parents: [accountConfig.driveFolderId],
      mimeType: 'application/json',
    };

    const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
    const jsonMedia = {
      mimeType: 'application/json',
      body: jsonBuffer,
    };

    await drive.files.create({
      requestBody: jsonMetadata,
      media: jsonMedia,
    });

    // Create text file with summary
    if (session.finalSummary) {
      const summaryContent = `20 Questions Session Summary\n\n` +
        `Session ID: ${session.id}\n` +
        `Created: ${session.createdAt}\n` +
        `Account Context: ${accountContext}\n` +
        `Goal: ${session.goal}\n\n` +
        `Summary:\n${session.finalSummary}\n\n` +
        `Questions & Answers:\n` +
        session.turns.map((turn, index) => 
          `${index + 1}. Q: ${turn.question}\n   A: ${turn.answer}`
        ).join('\n\n');

      const summaryMetadata = {
        name: `20q-session-${session.id}-summary.txt`,
        parents: [accountConfig.driveFolderId],
        mimeType: 'text/plain',
      };

      const summaryBuffer = Buffer.from(summaryContent, 'utf-8');
      const summaryMedia = {
        mimeType: 'text/plain',
        body: summaryBuffer,
      };

      await drive.files.create({
        requestBody: summaryMetadata,
        media: summaryMedia,
      });
    }

    return true;
  } catch (error) {
    console.error('Error writing to Google Drive:', error);
    return false;
  }
}

export async function readSessionFromDrive(sessionId: string): Promise<SessionData | null> {
  // Try both accounts to find the session
  const accounts: ('personal' | 'work')[] = ['personal', 'work'];
  
  for (const accountContext of accounts) {
    try {
      const accountConfig = getAccountConfig(accountContext);
      const drive = getDriveClient(accountConfig);

      // Search for the session file
      const response = await drive.files.list({
        q: `'${accountConfig.driveFolderId}' in parents and name = '20q-session-${sessionId}.json'`,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        const fileId = response.data.files[0].id;
        const file = await drive.files.get({
          fileId: fileId!,
          alt: 'media',
        });

        return file.data as SessionData;
      }
    } catch (error) {
      console.error(`Error reading from ${accountContext} account:`, error);
      continue;
    }
  }

  return null;
}

// Get calendar events from the appropriate account
export async function getCalendarEvents(accountContext: 'personal' | 'work') {
  const accountConfig = getAccountConfig(accountContext);
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: accountConfig.serviceAccountEmail,
      private_key: accountConfig.privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  const calendar = google.calendar({ version: 'v3', auth });
  
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + 3);

  const response = await calendar.events.list({
    calendarId: accountConfig.calendarId,
    timeMin: now.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });

  return response.data.items || [];
}
