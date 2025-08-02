// Test script for the rephrase functionality
const testRephrase = async () => {
  const testText = "I think that the current situation is really bad and we need to do something about it ASAP!";
  
  console.log('Testing rephrase functionality...');
  console.log('Original text:', testText);
  
  try {
    const response = await fetch('/api/rephrase-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: testText }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Rephrased text:', data.rephrasedText);
    console.log('✅ Test passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  console.log('This test should be run in a browser environment');
} else {
  // Browser environment
  console.log('Test script loaded. Run testRephrase() to test the functionality.');
} 