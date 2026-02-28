import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

const retellClient = new Retell({ 
  apiKey: process.env.RETELL_API_KEY! 
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const calls = await retellClient.call.list({ limit });

    const formattedCalls = calls.map(call => ({
      id: call.call_id,
      time: formatTime(call.start_timestamp),
      from: call.from_number || 'Unknown',
      to: call.to_number,
      duration: formatDuration(call.end_timestamp - call.start_timestamp),
      status: mapCallStatus(call.call_status),
      sentiment: categorizeSentiment(call.call_analysis?.sentiment_score || 0),
      summary: call.call_analysis?.summary || 'No summary available',
      purpose: call.call_analysis?.intent || 'General inquiry',
      transcript: call.transcript,
      recording_url: call.recording_url,
      analysis: call.call_analysis
    }));

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

function mapCallStatus(status: string) {
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