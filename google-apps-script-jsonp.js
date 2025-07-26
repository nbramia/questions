// Google Apps Script with JSONP support to avoid CORS issues
// This version handles both JSONP and regular POST requests

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Check if this is a GET request for response data
    if (e.parameter.action === 'getResponses') {
      return getResponsesForForm(e.parameter.formId);
    }
    
    let data;
    
    // Check if this is a JSONP request
    if (e.parameter.callback) {
      // JSONP request - data is in the 'data' parameter
      data = JSON.parse(e.parameter.data);
    } else {
      // Regular POST request
      data = JSON.parse(e.postData.contents);
    }
    
    // Get the spreadsheet - you'll need to replace this with your actual spreadsheet ID
    const spreadsheetId = '1CgqdeyNL3khePnFQkIbcS5zjjRxmHapOGncjA4Xk8oQ'; // Replace with your actual spreadsheet ID
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    // Get or create the sheet for this question
    const questionId = data.question_id;
    const formTitle = data.form_title || questionId; // Use form title if available, fallback to ID
    let sheet = getOrCreateSheet(spreadsheet, questionId, data); // Use questionId as sheet name
    
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
    
    // Check for uniqueness if required
    if (data.enforceUnique) {
      const existingRows = sheet.getDataRange().getValues();
      const ipColumn = 1; // IP address is in column B (index 1)
      
      // Check if this IP has already submitted
      for (let i = 1; i < existingRows.length; i++) { // Skip header row
        if (existingRows[i][ipColumn] === data.ip) {
          // IP already submitted, return error
          if (e.parameter.callback) {
            // JSONP error response
            const callback = e.parameter.callback;
            const result = JSON.stringify({ error: "You have already submitted a response." });
            return ContentService
              .createTextOutput(callback + '(' + result + ')')
              .setMimeType(ContentService.MimeType.JAVASCRIPT);
          } else {
            // Regular JSON error response
            return ContentService
              .createTextOutput(JSON.stringify({ error: "You have already submitted a response." }))
              .setMimeType(ContentService.MimeType.JSON);
          }
        }
      }
    }
    
    // Append the row to the sheet
    sheet.appendRow(rowData);
    
    // Return response based on request type
    if (e.parameter.callback) {
      // JSONP response
      const callback = e.parameter.callback;
      const result = JSON.stringify({ success: true });
      return ContentService
        .createTextOutput(callback + '(' + result + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Regular JSON response
      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
      
  } catch (error) {
    console.error('Error processing submission:', error);
    
    if (e.parameter.callback) {
      // JSONP error response
      const callback = e.parameter.callback;
      const result = JSON.stringify({ error: error.toString() });
      return ContentService
        .createTextOutput(callback + '(' + result + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // Regular JSON error response
      return ContentService
        .createTextOutput(JSON.stringify({ error: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
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
    
    // Add question headers based on the question labels
    const answers = data.answers;
    const questionLabels = data.question_labels || {};
    const questionKeys = Object.keys(answers).sort();
    
    for (const questionKey of questionKeys) {
      // Use the actual question label if available, otherwise fallback to generic name
      const headerName = questionLabels[questionKey] || `Question ${questionKey.replace('q', '')}`;
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

function getResponsesForForm(formId) {
  try {
    console.log(`getResponsesForForm called with formId: ${formId}`);
    
    // Get the spreadsheet - use the same ID as in your main function
    const spreadsheetId = '1CgqdeyNL3khePnFQkIbcS5zjjRxmHapOGncjA4Xk8oQ'; // Replace with your actual spreadsheet ID
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    
    console.log(`Opened spreadsheet with ID: ${spreadsheetId}`);
    
    // Get all sheet names for debugging
    const allSheets = spreadsheet.getSheets();
    const sheetNames = allSheets.map(sheet => sheet.getName());
    console.log(`All sheet names: ${sheetNames.join(', ')}`);
    
    // Try to get the form config to find the title
    let formTitle = formId; // fallback to formId if we can't get the title
    try {
      const configUrl = `https://nbramia.github.io/questions/question/${formId}/config.json`;
      console.log(`Fetching config from: ${configUrl}`);
      
      const configResponse = UrlFetchApp.fetch(configUrl);
      if (configResponse.getResponseCode() === 200) {
        const config = JSON.parse(configResponse.getContentText());
        formTitle = config.title || formId;
        console.log(`Found form title: ${formTitle}`);
      } else {
        console.log(`Failed to fetch config, using formId as fallback`);
      }
    } catch (configError) {
      console.log(`Error fetching config: ${configError}, using formId as fallback`);
    }
    
    // Try to get the sheet for this form by title first, then by ID as fallback
    let sheet = spreadsheet.getSheetByName(formTitle);
    if (!sheet) {
      console.log(`Sheet not found for formTitle: ${formTitle}, trying formId: ${formId}`);
      sheet = spreadsheet.getSheetByName(formId);
    }
    
    if (!sheet) {
      console.log(`Sheet not found for either formTitle: ${formTitle} or formId: ${formId}`);
      // No responses for this form yet
      return ContentService
        .createTextOutput(JSON.stringify({ 
          totalResponses: 0, 
          lastResponseAt: null, 
          responses: [],
          debug: {
            formId: formId,
            formTitle: formTitle,
            availableSheets: sheetNames
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    console.log(`Found sheet: ${sheet.getName()}`);
    
    // Get all data from the sheet
    const data = sheet.getDataRange().getValues();
    console.log(`Sheet has ${data.length} rows of data`);
    
    if (data.length <= 1) {
      // Only header row or empty sheet
      console.log(`Sheet has only header row or is empty`);
      return ContentService
        .createTextOutput(JSON.stringify({ 
          totalResponses: 0, 
          lastResponseAt: null, 
          responses: [],
          debug: {
            formId: formId,
            formTitle: formTitle,
            sheetName: sheet.getName(),
            rowCount: data.length
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Calculate response statistics
    const totalResponses = data.length - 1; // Subtract header row
    let lastResponseAt = null;
    
    if (totalResponses > 0) {
      // Get the most recent response timestamp (column A)
      const timestamps = data.slice(1).map(row => new Date(row[0]));
      const latestTimestamp = new Date(Math.max(...timestamps.map(d => d.getTime())));
      lastResponseAt = latestTimestamp.toISOString();
      console.log(`Found ${totalResponses} responses, latest at: ${lastResponseAt}`);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        totalResponses: totalResponses,
        lastResponseAt: lastResponseAt,
        responses: data.slice(1).map(row => ({
          timestamp: row[0],
          ip: row[1],
          userAgent: row[2],
          // Include other columns as needed
        })),
        debug: {
          formId: formId,
          formTitle: formTitle,
          sheetName: sheet.getName(),
          rowCount: data.length
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error getting responses for form:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        error: error.toString(),
        totalResponses: 0, 
        lastResponseAt: null, 
        responses: [],
        debug: {
          formId: formId,
          error: error.toString()
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
} 