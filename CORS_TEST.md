# CORS Troubleshooting Guide

## Step 1: Test Your Google Apps Script Directly

1. **Copy your Google Script URL** (the one from your deployment)
2. **Open a new browser tab** and paste the URL
3. **You should see**: "Form submission endpoint"
4. **If you see an error**, the deployment isn't working

## Step 2: Check Deployment Settings

Make sure your Google Apps Script deployment has these settings:

- **Execute as**: "Me"
- **Who has access**: "Anyone"
- **Type**: "Web app"

## Step 3: Alternative CORS Solution

If CORS is still failing, try this alternative approach:

### Option A: Use a CORS Proxy
Update the template to use a CORS proxy:

```javascript
// In the template, change the fetch call to:
const res = await fetch("https://cors-anywhere.herokuapp.com/" + cfg.googleScriptUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(submission),
});
```

### Option B: Use JSONP (Simpler)
Modify the Google Apps Script to support JSONP:

```javascript
// In doPost function, add this at the beginning:
if (e.parameter.callback) {
  // JSONP request
  const callback = e.parameter.callback;
  const result = JSON.stringify({ success: true });
  return ContentService
    .createTextOutput(callback + '(' + result + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

## Step 4: Debug Steps

1. **Check browser console** for detailed error messages
2. **Test the Google Script URL** directly in browser
3. **Verify the deployment** is active and accessible
4. **Check if the script has the correct spreadsheet ID**

## Step 5: Manual Test

Try this in your browser console on your form page:

```javascript
fetch('YOUR_GOOGLE_SCRIPT_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question_id: 'test',
    form_title: 'Test Form',
    timestamp: new Date().toISOString(),
    answers: { q0: 'test answer' },
    ip: '127.0.0.1',
    user_agent: 'test'
  })
}).then(r => r.json()).then(console.log).catch(console.error);
```

This will help identify if the issue is with the script or the form. 