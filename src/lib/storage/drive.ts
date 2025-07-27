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
}

// Initialize Google Drive API
function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

export async function writeSessionToDrive(session: SessionData): Promise<boolean> {
  try {
    const drive = getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      console.error('Google Drive folder ID not configured');
      return false;
    }

    // Create JSON file with full session data
    const jsonContent = JSON.stringify(session, null, 2);
    const jsonMetadata = {
      name: `20q-session-${session.id}.json`,
      parents: [folderId],
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
        `Goal: ${session.goal}\n\n` +
        `Summary:\n${session.finalSummary}\n\n` +
        `Questions & Answers:\n` +
        session.turns.map((turn, index) => 
          `${index + 1}. Q: ${turn.question}\n   A: ${turn.answer}`
        ).join('\n\n');

      const summaryMetadata = {
        name: `20q-session-${session.id}-summary.txt`,
        parents: [folderId],
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
  try {
    const drive = getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      console.error('Google Drive folder ID not configured');
      return null;
    }

    // Search for the session file
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name = '20q-session-${sessionId}.json'`,
      fields: 'files(id, name)',
    });

    if (!response.data.files || response.data.files.length === 0) {
      return null;
    }

    const fileId = response.data.files[0].id;
    const file = await drive.files.get({
      fileId: fileId!,
      alt: 'media',
    });

    return file.data as SessionData;
  } catch (error) {
    console.error('Error reading from Google Drive:', error);
    return null;
  }
}
