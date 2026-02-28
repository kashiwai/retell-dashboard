import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { to_number, from_number, agent_id, metadata } = body;

    // Validate required fields
    if (!to_number || !from_number) {
      return NextResponse.json(
        { error: 'Missing required fields: to_number and from_number' },
        { status: 400 }
      );
    }

    // Create phone call using Retell API
    const call = await retellClient.call.createPhoneCall({
      to_number,
      from_number,
      metadata: metadata || {},
      retell_llm_dynamic_variables: {
        customer_name: metadata?.customer_name || 'お客様',
        company_name: metadata?.company_name || '弊社',
        current_time: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      }
    } as any);

    // Return call details
    return NextResponse.json({
      success: true,
      call_id: call.call_id,
      status: call.call_status,
      from: from_number,
      to: to_number,
      agent_id: call.agent_id,
      start_timestamp: call.start_timestamp
    });
    
  } catch (error: any) {
    console.error('Make call error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}