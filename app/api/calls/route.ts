import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for API key before proceeding
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Retell client at runtime
    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const calls = await retellClient.call.list({ limit });

    const formattedCalls = calls.map(call => {
      // Type-safe property access
      const phoneCall = call as any;
      const analysis = call.call_analysis as any;
      
      return {
        id: call.call_id,
        time: formatTime(call.start_timestamp || Date.now()),
        from: phoneCall.from_number || phoneCall.from_phone_number || 'Unknown',
        to: phoneCall.to_number || phoneCall.to_phone_number || 'Unknown',
        duration: formatDuration((call.end_timestamp || 0) - (call.start_timestamp || 0)),
        status: mapCallStatus(call.call_status || 'unknown'),
        sentiment: categorizeSentiment(analysis?.sentiment_score || 0),
        summary: analysis?.summary || 'No summary available',
        purpose: analysis?.intent || 'General inquiry',
        transcript: call.transcript || '',
        recording_url: call.recording_url || null,
        analysis: analysis || null
      };
    });

    return NextResponse.json(formattedCalls);
  } catch (error: any) {
    console.error('Recent calls error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function mapCallStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'ended': 'completed',
    'error': 'failed',
    'in-progress': 'active',
    'transferred': 'transferred'
  };
  return statusMap[status] || status;
}

function categorizeSentiment(score: number) {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  return 'neutral';
}