import { NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

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
    
    // Format phone numbers with additional info
    const formattedNumbers = phoneNumbers.map((number: any) => ({
      id: number.phone_number || number.phone_number_id,
      number: number.phone_number,
      nickname: number.nickname || 'Unnamed',
      area_code: number.area_code || '',
      country: 'JP', // Assuming Japan for +81 numbers
      status: number.status || 'active',
      agent_id: number.inbound_agent_id || number.agent_id,
      created_at: number.created_at,
      
      // Mock additional data for now (can be calculated from calls)
      calls_today: 0,
      calls_this_month: 0,
      average_duration: '0:00',
      
      // Twilio integration info
      twilio_sid: process.env.TWILIO_PHONE_NUMBER === number.phone_number ? 
        process.env.TWILIO_ACCOUNT_SID : null
    }));
    
    // If we have the Twilio number configured, add it
    if (process.env.TWILIO_PHONE_NUMBER && 
        !formattedNumbers.find(n => n.number === process.env.TWILIO_PHONE_NUMBER)) {
      formattedNumbers.push({
        id: 'twilio-primary',
        number: process.env.TWILIO_PHONE_NUMBER,
        nickname: 'Twilio Primary',
        area_code: '050',
        country: 'JP',
        status: 'active',
        agent_id: null,
        created_at: new Date().toISOString(),
        calls_today: 0,
        calls_this_month: 0,
        average_duration: '0:00',
        twilio_sid: process.env.TWILIO_ACCOUNT_SID
      });
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