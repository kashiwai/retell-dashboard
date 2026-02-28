import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    // Get call details
    const { callId } = await params;
    const call = await retellClient.call.retrieve(callId);
    
    if (!call.recording_url) {
      return NextResponse.json(
        { error: 'No recording available for this call' },
        { status: 404 }
      );
    }

    // Fetch the recording from Retell's storage
    const recordingResponse = await fetch(call.recording_url);
    
    if (!recordingResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: 500 }
      );
    }

    // Stream the audio back to the client
    const audioBuffer = await recordingResponse.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
    
  } catch (error: any) {
    console.error('Recording error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}