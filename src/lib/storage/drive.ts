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
    console.log('writeSessionToDrive called with session ID:', session.id);
    
    const accountContext = session.accountContext || determineAccountContext(session);
    console.log('Determined account context:', accountContext);
    
    const accountConfig = getAccountConfig(accountContext);
    console.log('Account config retrieved:', {
      email: accountConfig.serviceAccountEmail ? 'Set' : 'Not set',
      privateKey: accountConfig.privateKey ? 'Set' : 'Not set',
      driveFolderId: accountConfig.driveFolderId ? 'Set' : 'Not set',
      calendarId: accountConfig.calendarId ? 'Set' : 'Not set'
    });

    const drive = getDriveClient(accountConfig);
    console.log('Drive client created successfully');

    // Create the JSON file using simple media upload (no multipart)
    const jsonContent = JSON.stringify(session, null, 2);
    const jsonFileName = `20q-session-${session.id}.json`;

    console.log('Creating JSON file in Google Drive...');
    const createParams = {
      media: {
        mimeType: 'application/json',
        body: jsonContent, // Plain string - no .pipe needed
      },
      uploadType: 'media', // Force simple upload
    };
    console.log('Google Drive create parameters:', JSON.stringify(createParams, null, 2));
    
    const jsonFile = await drive.files.create(createParams);
    console.log('JSON file created successfully:', jsonFile.data.id);

    // Update the file with metadata after creation
    await drive.files.update({
      fileId: jsonFile.data.id!,
      requestBody: {
        name: jsonFileName,
        parents: [accountConfig.driveFolderId],
      },
    });

    // Create the summary text file if summary exists
    if (session.finalSummary) {
      console.log('Creating summary text file...');
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

      const summaryFileName = `20q-session-${session.id}-summary.txt`;

      const summaryCreateParams = {
        media: {
          mimeType: 'text/plain',
          body: summaryContent, // Plain string - no .pipe needed
        },
        uploadType: 'media', // Force simple upload
      };
      console.log('Google Drive summary create parameters:', JSON.stringify(summaryCreateParams, null, 2));
      
      const summaryFile = await drive.files.create(summaryCreateParams);
      console.log('Summary file created successfully:', summaryFile.data.id);

      // Update the summary file with metadata after creation
      await drive.files.update({
        fileId: summaryFile.data.id!,
        requestBody: {
          name: summaryFileName,
          parents: [accountConfig.driveFolderId],
        },
      });
    }

    console.log('writeSessionToDrive completed successfully');
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
