import { NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';
import { getPhoneTenantMapping } from '@/config/phone-tenant-mapping';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    // Get phone numbers from Retell
    const phoneNumbers = await retellClient.phoneNumber.list();
    
    // Get tenant phone mapping
    const tenantMapping = getPhoneTenantMapping();
    const twilioNumbers = Object.entries(tenantMapping)
      .filter(([phone]) => phone !== 'default')
      .map(([phone, config]) => ({
        phone,
        ...config
      }));
    
    // Format phone numbers with additional info
    const formattedNumbers = phoneNumbers.map((number: any) => {
      // Find tenant config for this phone number
      const tenantConfig = tenantMapping[number.phone_number];
      
      return {
        id: number.phone_number || number.phone_number_id,
        number: number.phone_number,
        nickname: number.nickname || tenantConfig?.name || 'Unnamed',
        area_code: number.area_code || '',
        country: 'JP', // Assuming Japan for +81 numbers
        status: number.status || 'active',
        agent_id: number.inbound_agent_id || number.agent_id || tenantConfig?.agentId,
        created_at: number.created_at,
        
        // Mock additional data for now (can be calculated from calls)
        calls_today: 0,
        calls_this_month: 0,
        average_duration: '0:00',
        
        // Twilio integration info - check if this number is in tenant mapping
        twilio_sid: twilioNumbers.some(t => t.phone === number.phone_number) ? 
          process.env.TWILIO_ACCOUNT_SID : null,
        
        // Tenant info
        tenant_id: tenantConfig?.tenantId,
        tenant_name: tenantConfig?.name,
        tenant_color: tenantConfig?.primaryColor
      };
    });
    
    // Add any Twilio numbers from tenant mapping that aren't already in Retell
    for (const twilioConfig of twilioNumbers) {
      if (!formattedNumbers.find(n => n.number === twilioConfig.phone)) {
        formattedNumbers.push({
          id: `twilio-${twilioConfig.tenantId}`,
          number: twilioConfig.phone,
          nickname: twilioConfig.name,
          area_code: '050',
          country: 'JP',
          status: 'active',
          agent_id: twilioConfig.agentId,
          created_at: new Date().toISOString(),
          calls_today: 0,
          calls_this_month: 0,
          average_duration: '0:00',
          twilio_sid: process.env.TWILIO_ACCOUNT_SID,
          tenant_id: twilioConfig.tenantId,
          tenant_name: twilioConfig.name,
          tenant_color: twilioConfig.primaryColor
        });
      }
    }
    
    return NextResponse.json(formattedNumbers);
    
  } catch (error: any) {
    console.error('Phone numbers error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}