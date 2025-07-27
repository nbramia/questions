import { NextResponse } from 'next/server';
import { sendTelegramMessage, send20QNotification } from '@/lib/20q/telegram';

interface NotificationRequest {
  message?: string;
  goal?: string;
  sessionId?: string;
  chatId?: string;
}

export async function POST(req: Request) {
  try {
    const body: NotificationRequest = await req.json();
    const { message, goal, sessionId, chatId } = body;

    // Validate request
    if (!message && (!goal || !sessionId)) {
      return NextResponse.json(
        { error: 'Either message or goal+sessionId is required' },
        { status: 400 }
      );
    }

    let success: boolean;

    if (message) {
      // Send custom message
      success = await sendTelegramMessage(message, chatId);
    } else {
      // Send 20Q notification
      success = await send20QNotification(goal!, sessionId!, message);
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in notify:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
