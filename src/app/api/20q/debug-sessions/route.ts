import { NextResponse } from 'next/server';
import { google } from 'googleapis';

interface GoogleAccountConfig {
  serviceAccountEmail: string;
  privateKey: string;
  driveFolderId: string;
  calendarId: string;
  accountType: 'personal' | 'work';
}

function getAccountConfig(context: 'personal' | 'work'): GoogleAccountConfig {
  const suffix = context === 'personal' ? '_PERSONAL' : '_WORK';
  
  return {
    serviceAccountEmail: process.env[`GOOGLE_SERVICE_ACCOUNT_EMAIL${suffix}`] || '',
    privateKey: process.env[`GOOGLE_PRIVATE_KEY${suffix}`] || '',
    driveFolderId: process.env[`GOOGLE_DRIVE_FOLDER_ID${suffix}`] || '',
    calendarId: process.env[`GOOGLE_CALENDAR_ID${suffix}`] || '',
    accountType: context
  };
}

function getDriveClient(accountConfig: GoogleAccountConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: accountConfig.serviceAccountEmail,
      private_key: accountConfig.privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

export async function GET(req: Request) {
  try {
    const accounts: ('personal' | 'work')[] = ['personal', 'work'];
    const results: any[] = [];
    
    for (const accountContext of accounts) {
      try {
        const accountConfig = getAccountConfig(accountContext);
        const drive = getDriveClient(accountConfig);

        console.log(`Checking ${accountContext} account:`, {
          email: accountConfig.serviceAccountEmail ? 'Set' : 'Not set',
          privateKey: accountConfig.privateKey ? 'Set' : 'Not set',
          driveFolderId: accountConfig.driveFolderId ? 'Set' : 'Not set',
          calendarId: accountConfig.calendarId ? 'Set' : 'Not set'
        });

        // List all files in the folder
        const response = await drive.files.list({
          q: `'${accountConfig.driveFolderId}' in parents`,
          fields: 'files(id, name, createdTime)',
        });

        const files = response.data.files || [];
        console.log(`Found ${files.length} files in ${accountContext} account`);
        
        results.push({
          account: accountContext,
          files: files.map(f => ({
            name: f.name,
            id: f.id,
            created: f.createdTime
          }))
        });

      } catch (error) {
        console.error(`Error checking ${accountContext} account:`, error);
        results.push({
          account: accountContext,
          error: error instanceof Error ? error.message : 'Unknown error',
          files: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error in debug-sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 