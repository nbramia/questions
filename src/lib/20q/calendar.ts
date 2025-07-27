import { google } from 'googleapis';
import { determineAccountContext } from '../storage/drive';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
}

interface StructuredEvent {
  title: string;
  time: string;
  duration: string;
  type: 'meeting' | 'deadline' | 'personal' | 'other';
  description: string;
  accountContext: 'personal' | 'work';
}

interface GoogleAccountConfig {
  serviceAccountEmail: string;
  privateKey: string;
  driveFolderId: string;
  calendarId: string;
  accountType: 'personal' | 'work';
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

// Initialize Google Calendar API with specific account
function getCalendarClient(accountConfig: GoogleAccountConfig) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: accountConfig.serviceAccountEmail,
      private_key: accountConfig.privateKey.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  return google.calendar({ version: 'v3', auth });
}

export async function getUpcomingEvents(daysAhead: number = 3, accountContext?: 'personal' | 'work'): Promise<StructuredEvent[]> {
  try {
    // If no account context provided, get events from both accounts
    if (!accountContext) {
      const personalEvents = await getUpcomingEvents(daysAhead, 'personal');
      const workEvents = await getUpcomingEvents(daysAhead, 'work');
      return [...personalEvents, ...workEvents];
    }

    const accountConfig = getAccountConfig(accountContext);
    const calendar = getCalendarClient(accountConfig);

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + daysAhead);

    const response = await calendar.events.list({
      calendarId: accountConfig.calendarId,
      timeMin: now.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    const events = response.data.items || [];
    
    return events.map(event => {
      const start = new Date(event.start?.dateTime || event.start?.date || '');
      const end = new Date(event.end?.dateTime || event.end?.date || '');
      
      // Determine event type based on summary and description
      const summary = event.summary || '';
      const description = event.description || '';
      const text = `${summary} ${description}`.toLowerCase();
      
      let type: 'meeting' | 'deadline' | 'personal' | 'other' = 'other';
      if (text.includes('meeting') || text.includes('call') || text.includes('zoom')) {
        type = 'meeting';
      } else if (text.includes('deadline') || text.includes('due') || text.includes('submit')) {
        type = 'deadline';
      } else if (text.includes('personal') || text.includes('family') || text.includes('lunch')) {
        type = 'personal';
      }

      // Calculate duration
      const durationMs = end.getTime() - start.getTime();
      const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;
      const duration = durationHours >= 1 ? `${durationHours}h` : `${Math.round(durationMs / (1000 * 60))}m`;

      return {
        title: summary,
        time: start.toLocaleString(),
        duration,
        type,
        description: description || 'No description',
        accountContext
      };
    });

  } catch (error) {
    console.error(`Error fetching calendar events for ${accountContext}:`, error);
    return [];
  }
}

export function formatCalendarForPrompt(events: StructuredEvent[]): string {
  if (events.length === 0) {
    return 'No upcoming events in the next 3 days.';
  }

  // Group events by account context
  const personalEvents = events.filter(e => e.accountContext === 'personal');
  const workEvents = events.filter(e => e.accountContext === 'work');

  let result = '';

  if (personalEvents.length > 0) {
    result += 'Personal Calendar Events:\n';
    personalEvents.forEach(event => {
      result += `- ${event.title} (${event.type}) at ${event.time} for ${event.duration}\n`;
    });
    result += '\n';
  }

  if (workEvents.length > 0) {
    result += 'Work Calendar Events:\n';
    workEvents.forEach(event => {
      result += `- ${event.title} (${event.type}) at ${event.time} for ${event.duration}\n`;
    });
  }

  return result.trim();
}

// Get calendar events for a specific session context
export async function getCalendarEventsForSession(session: any): Promise<StructuredEvent[]> {
  const accountContext = determineAccountContext(session);
  return await getUpcomingEvents(3, accountContext);
}
