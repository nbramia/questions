// Test script to verify bot token and get bot info
// Run with: node test-bot-info.js

const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; // Replace with your actual token

async function testBotInfo() {
  console.log('🤖 Testing Bot Token...\n');

  try {
    // Test 1: Get bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const botInfo = await botInfoResponse.json();

    if (botInfo.ok) {
      console.log('✅ Bot token is valid!');
      console.log('📋 Bot Info:');
      console.log(`   Name: ${botInfo.result.first_name}`);
      console.log(`   Username: @${botInfo.result.username}`);
      console.log(`   ID: ${botInfo.result.id}`);
      console.log(`   Can join groups: ${botInfo.result.can_join_groups}`);
      console.log(`   Can read all group messages: ${botInfo.result.can_read_all_group_messages}`);
      console.log(`   Supports inline queries: ${botInfo.result.supports_inline_queries}`);
    } else {
      console.log('❌ Bot token is invalid:');
      console.log(botInfo);
      return;
    }

    // Test 2: Get updates
    const updatesResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
    const updates = await updatesResponse.json();

    console.log('\n📨 Recent Updates:');
    if (updates.ok && updates.result.length > 0) {
      console.log(`   Found ${updates.result.length} updates`);
      updates.result.forEach((update, index) => {
        if (update.message) {
          console.log(`   Update ${index + 1}:`);
          console.log(`     From: ${update.message.from.first_name} (ID: ${update.message.from.id})`);
          console.log(`     Chat ID: ${update.message.chat.id}`);
          console.log(`     Message: "${update.message.text}"`);
          console.log(`     Date: ${new Date(update.message.date * 1000).toLocaleString()}`);
        }
      });
    } else {
      console.log('   No updates found (this is normal if you haven\'t sent messages yet)');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Make sure you\'ve sent a message to your bot');
    console.log('2. Check that bot privacy is disabled in @BotFather');
    console.log('3. Try sending "/start" to your bot');

  } catch (error) {
    console.log('❌ Error testing bot:', error.message);
  }
}

testBotInfo(); 