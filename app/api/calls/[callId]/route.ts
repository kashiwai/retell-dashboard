import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// GET: Get call details with transcript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const { callId } = await params;

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    // Get call details
    const call = await retellClient.call.retrieve(callId) as any;
    
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Format call details with all information
    const callDetails = {
      id: call.call_id,
      start_time: call.start_timestamp,
      end_time: call.end_timestamp,
      duration: (call.end_timestamp || 0) - (call.start_timestamp || 0),
      from_number: call.from_number || call.from_phone_number,
      to_number: call.to_number || call.to_phone_number,
      agent_id: call.agent_id,
      status: call.call_status,
      
      // Recording and transcript
      recording_url: call.recording_url,
      transcript: call.transcript,
      transcript_json: call.transcript_json || [],
      
      // Analysis
      call_analysis: call.call_analysis || {
        summary: '',
        intent: '',
        sentiment_score: 0,
        key_points: [],
        action_items: []
      },
      
      // Metadata
      metadata: call.metadata || {},
      
      // Additional details
      disconnection_reason: call.disconnection_reason,
      call_type: call.call_type || 'phone_call',
    };

    return NextResponse.json(callDetails);
    
  } catch (error: any) {
    console.error('Get call details error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}