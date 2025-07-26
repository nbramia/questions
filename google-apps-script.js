// Improved Google Apps Script for handling form submissions
// This version can handle dynamic headers based on the actual questions

function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);
    
    // Get the spreadsheet - you'll need to replace this with your actual spreadsheet ID
    const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Replace with your actual spreadsheet ID
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // Get or create the sheet for this question
    const questionId = data.question_id;
    const formTitle = data.form_title || questionId; // Use form title if available, fallback to ID
    let sheet = getOrCreateSheet(spreadsheet, formTitle, data);
    
    // Prepare the row data
    const rowData = [
      data.timestamp,
      data.ip,
      data.user_agent
    ];
    
    // Add answers to the row in the correct order
    const answers = data.answers;
    const questionKeys = Object.keys(answers).sort(); // Sort to maintain consistent order
    
    for (const questionKey of questionKeys) {
      const answer = answers[questionKey];
      // Handle array answers (for checkboxes) by joining with commas
      const answerValue = Array.isArray(answer) ? answer.join(', ') : answer;
      rowData.push(answerValue || '');
    }
    
    // Append the row to the sheet
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing submission:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(spreadsheet, questionId, data) {
  // Try to get existing sheet
  let sheet = spreadsheet.getSheetByName(questionId);
  
  if (!sheet) {
    // Create new sheet
    sheet = spreadsheet.insertSheet(questionId);
    
    // Set up headers
    const headers = ['Timestamp', 'IP Address', 'User Agent'];
    
    // Add question headers based on the answers
    const answers = data.answers;
    const questionKeys = Object.keys(answers).sort();
    
    for (const questionKey of questionKeys) {
      // Create a readable header name
      const headerName = `Question ${questionKey.replace('q', '')}`;
      headers.push(headerName);
    }
    
    // Set headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f0f0f0');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);
    
    // Freeze the header row
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

// Function to set up CORS headers (needed for web requests)
function doGet(e) {
  return ContentService
    .createTextOutput('Form submission endpoint')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Optional: Function to manually set up a sheet with specific headers
function setupSheetWithHeaders(spreadsheetId, sheetName, questionHeaders) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  
  const headers = ['Timestamp', 'IP Address', 'User Agent', ...questionHeaders];
  
  // Clear existing content
  sheet.clear();
  
  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#f0f0f0');
  
  // Auto-resize columns
  sheet.autoResizeColumns(1, headers.length);
  
  // Freeze the header row
  sheet.setFrozenRows(1);
} 