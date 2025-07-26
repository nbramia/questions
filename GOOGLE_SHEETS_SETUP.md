# Google Sheets Integration Setup

## Step 1: Create a Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Copy the spreadsheet ID from the URL (it's the long string between `/d/` and `/edit`)
   - Example: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - The ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## Step 2: Create Google Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the default code with the content from `google-apps-script-improved.js`
4. Replace `YOUR_SPREADSHEET_ID` with your actual spreadsheet ID
5. Save the project with a name like "Form Submissions"

## Step 3: Deploy the Script

1. Click "Deploy" → "New deployment"
2. Choose "Web app" as the type
3. Set "Execute as" to "Me"
4. Set "Who has access" to "Anyone"
5. Click "Deploy"
6. Copy the Web app URL that's generated

## Step 4: Update Environment Variables

Add the Google Script URL to your `.env.local` file:

```
GITHUB_TOKEN=your_github_token_here
NEXT_PUBLIC_ADMIN_PASSWORD=soccer
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Replace `YOUR_SCRIPT_ID` with the actual script ID from the deployment URL.

## Step 5: Test the Integration

1. Create a new form through your admin interface
2. Submit a test response
3. Check your Google Spreadsheet - you should see a new tab created with the form ID
4. The responses will be saved with timestamps, IP addresses, and user agents

## How It Works

- Each form gets its own tab in the spreadsheet
- The tab is named with the form ID (e.g., "abc123")
- Headers are automatically created based on the questions
- Each submission creates a new row with:
  - Timestamp
  - IP Address
  - User Agent
  - Answers to each question

## Troubleshooting

- If submissions aren't working, check the browser console for errors
- Make sure the Google Script URL is correct in your environment variables
- Verify the spreadsheet ID is correct in the Google Apps Script
- Check that the Google Apps Script is deployed as a web app with "Anyone" access 