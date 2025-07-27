import { google } from 'googleapis';

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
}

// Initialize Google Calendar API
function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  return google.calendar({ version: 'v3', auth });
}

export async function getUpcomingEvents(daysAhead: number = 3): Promise<StructuredEvent[]> {
  try {
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + daysAhead);

    const response = await calendar.events.list({
      calendarId,
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
        description: description || 'No description'
      };
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

export function formatCalendarForPrompt(events: StructuredEvent[]): string {
  if (events.length === 0) {
    return 'No upcoming events in the next 3 days.';
  }

  const eventStrings = events.map(event => 
    `- ${event.title} (${event.type}) at ${event.time} for ${event.duration}`
  );

  return `Upcoming events:\n${eventStrings.join('\n')}`;
}
