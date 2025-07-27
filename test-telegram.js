// Test script for Telegram bot setup
// Run with: node test-telegram.js

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID_HERE';

async function testTelegramBot() {
  console.log('🤖 Testing Telegram Bot Setup...\n');

  if (TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('❌ Please set your TELEGRAM_BOT_TOKEN in the script');
    return;
  }

  if (TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID_HERE') {
    console.log('❌ Please set your TELEGRAM_CHAT_ID in the script');
    return;
  }

  try {
    // Test sending a message
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: '🧪 Test message from 20 Questions bot setup!',
        parse_mode: 'HTML'
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Telegram bot test successful!');
      console.log('📱 You should have received a test message in Telegram');
      console.log('\n🔧 Your bot is ready for 20 Questions notifications!');
    } else {
      console.log('❌ Telegram bot test failed:');
      console.log(data);
    }
  } catch (error) {
    console.log('❌ Error testing Telegram bot:', error.message);
  }
}

testTelegramBot(); 