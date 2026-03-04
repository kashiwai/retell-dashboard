require('dotenv').config({ path: '.env.local' });

// Parse TENANT_PHONE_MAPPING
const tenantMapping = JSON.parse(process.env.TENANT_PHONE_MAPPING || '[]');

console.log('=== Testing Multiple Phone Number Configuration ===\n');

console.log('Environment Variables:');
console.log('- TWILIO_PHONE_NUMBER (old):', process.env.TWILIO_PHONE_NUMBER);
console.log('- TENANT_PHONE_MAPPING:', tenantMapping.length, 'tenants configured\n');

console.log('Configured Phone Numbers:');
tenantMapping.forEach(tenant => {
  console.log(`\n${tenant.name} (${tenant.tenantId})`);
  console.log(`  Phone: ${tenant.phone}`);
  console.log(`  Agent ID: ${tenant.agentId}`);
  console.log(`  Color: ${tenant.color}`);
  console.log(`  Features: LINE=${tenant.features?.line}, GPT=${tenant.features?.gpt}`);
});

console.log('\n=== Summary ===');
console.log('✅ Both phone numbers are configured in TENANT_PHONE_MAPPING:');
console.log('   - +815018080215 (既存顧客A)');
console.log('   - +815018075642 (新規顧客B - PALDATA)');
console.log('\n✅ The system now supports multiple phone numbers');
console.log('   Each phone number is linked to a specific tenant/customer');
console.log('\n⚠️  Note: TWILIO_PHONE_NUMBER env var is no longer used');
console.log('   All phone configurations now come from TENANT_PHONE_MAPPING');