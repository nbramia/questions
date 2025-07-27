// Environment variables verification script
// Run with: node verify-env.js

console.log('🔍 Verifying 20Q Environment Variables...\n');

const requiredVars = {
  // OpenAI
  'OPENAI_API_KEY': 'OpenAI API for question generation',
  
  // Personal Google Account
  'GOOGLE_SERVICE_ACCOUNT_EMAIL_PERSONAL': 'Personal Google Service Account Email',
  'GOOGLE_PRIVATE_KEY_PERSONAL': 'Personal Google Private Key',
  'GOOGLE_DRIVE_FOLDER_ID_PERSONAL': 'Personal Google Drive Folder ID',
  'GOOGLE_CALENDAR_ID_PERSONAL': 'Personal Google Calendar ID',
  
  // Work Google Account
  'GOOGLE_SERVICE_ACCOUNT_EMAIL_WORK': 'Work Google Service Account Email',
  'GOOGLE_PRIVATE_KEY_WORK': 'Work Google Private Key',
  'GOOGLE_DRIVE_FOLDER_ID_WORK': 'Work Google Drive Folder ID',
  'GOOGLE_CALENDAR_ID_WORK': 'Work Google Calendar ID',
  
  // Telegram
  'TELEGRAM_BOT_TOKEN': 'Telegram Bot Token',
  'TELEGRAM_CHAT_ID': 'Telegram Chat ID'
};

let allPresent = true;

console.log('📋 Checking Environment Variables:\n');

Object.entries(requiredVars).forEach(([varName, description]) => {
  const value = process.env[varName];
  
  if (value) {
    // Mask sensitive values for display
    let displayValue = value;
    if (varName.includes('KEY') || varName.includes('TOKEN') || varName.includes('PRIVATE')) {
      displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 10);
    }
    
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: MISSING (${description})`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPresent) {
  console.log('🎉 All environment variables are set!');
  console.log('🚀 Your 20Q system should be ready to deploy.');
} else {
  console.log('⚠️  Some environment variables are missing.');
  console.log('📝 Please add the missing variables to your .env.local and Vercel.');
}

console.log('\n🔧 Next Steps:');
console.log('1. Add missing variables to Vercel dashboard');
console.log('2. Deploy to production');
console.log('3. Test the 20Q system at your production URL'); 