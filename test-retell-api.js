const { Retell } = require('retell-sdk');

async function testRetellAPI() {
  const retellClient = new Retell({
    apiKey: 'key_424284122e45372cf604e251018c'
  });

  try {
    console.log('Fetching calls from Retell API...');
    const calls = await retellClient.call.list({ limit: 5 });
    
    console.log(`Found ${calls.length} calls\n`);
    
    if (calls.length > 0) {
      const call = calls[0];
      console.log('First call details:');
      console.log('ID:', call.call_id);
      console.log('From Number:', call.from_number);
      console.log('From Phone Number:', call.from_phone_number); 
      console.log('To Number:', call.to_number);
      console.log('To Phone Number:', call.to_phone_number);
      console.log('Start Timestamp:', call.start_timestamp);
      console.log('End Timestamp:', call.end_timestamp);
      console.log('Status:', call.call_status);
      console.log('Has Transcript:', !!call.transcript);
      console.log('Has Call Analysis:', !!call.call_analysis);
      
      if (call.call_analysis) {
        console.log('\nCall Analysis:');
        console.log('Summary:', call.call_analysis.summary?.substring(0, 100));
        console.log('Sentiment Score:', call.call_analysis.sentiment_score);
        console.log('Custom Analysis:', call.call_analysis.custom_analysis);
      }
      
      console.log('\nFull call object keys:', Object.keys(call));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testRetellAPI();