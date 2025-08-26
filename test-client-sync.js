// Test script for client sync
const testClientSync = async () => {
  try {
    console.log('🔄 Testing client sync...');
    
    const response = await fetch('https://igffjtzypcgfbytxtgnq.supabase.co/functions/v1/client-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnZmZqdHp5cGNnZmJ5dHh0Z25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk4ODM1OCwiZXhwIjoyMDcxNTY0MzU4fQ.YCipPsNZYQI2B2ggeZlYfZKguMBjjBAXh-Q9lDEMMv0'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Success:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testClientSync();
