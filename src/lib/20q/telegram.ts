// ============================
// src/lib/20q/telegram.ts
// ============================

/**
 * Wraps Telegram Bot API interactions
 * Used by notification functions to deliver user pings
 */

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

export async function sendTelegramMessage(message: string, chatId?: string): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const defaultChatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken) {
      console.error('Telegram bot token not configured');
      return false;
    }

    const targetChatId = chatId || defaultChatId;
    if (!targetChatId) {
      console.error('Telegram chat ID not configured');
      return false;
    }

    const telegramMessage: TelegramMessage = {
      chat_id: targetChatId,
      text: message,
      parse_mode: 'HTML'
    };

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramMessage),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

export async function send20QNotification(
  goal: string, 
  sessionId: string, 
  message?: string
): Promise<boolean> {
  const defaultMessage = `🤔 20 Questions Reminder\n\n` +
    `Goal: ${goal}\n\n` +
    `Ready to continue your session? ` +
    `https://ramia.us/20q/session/${sessionId}`;

  const notificationMessage = message || defaultMessage;
  
  return sendTelegramMessage(notificationMessage);
}
