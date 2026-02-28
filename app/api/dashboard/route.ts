import { NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

// Initialize Retell client only when API key is available
const getRetellClient = () => {
  if (!process.env.RETELL_API_KEY) {
    throw new Error('RETELL_API_KEY is not configured');
  }
  return new Retell({ 
    apiKey: process.env.RETELL_API_KEY 
  });
};

export async function GET() {
  try {
    // Check for API key before proceeding
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const retellClient = getRetellClient();
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get call list from Retell
    const calls = await retellClient.call.list({ limit: 100 });
    
    // Filter today's calls
    const todayCalls = calls.filter(call => {
      if (!call.start_timestamp) return false;
      const callDate = new Date(call.start_timestamp);
      return callDate >= today && callDate < tomorrow;
    });

    // Calculate stats
    const stats = {
      todaysCalls: todayCalls.length,
      avgDuration: calculateAvgDuration(todayCalls),
      aiResolutionRate: calculateResolutionRate(todayCalls),
      sentimentAnalysis: analyzeSentiment(todayCalls),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function calculateAvgDuration(calls: any[]): string {
  if (calls.length === 0) return '0:00';
  const totalMs = calls.reduce((sum, call) => {
    const start = call.start_timestamp || 0;
    const end = call.end_timestamp || 0;
    return sum + (end - start);
  }, 0);
  const avgMs = totalMs / calls.length;
  return formatDuration(avgMs);
}

function calculateResolutionRate(calls: any[]): number {
  if (calls.length === 0) return 0;
  const resolved = calls.filter(call => 
    call.call_status === 'ended' && !call.transferred_to).length;
  return Math.round((resolved / calls.length) * 100);
}

function analyzeSentiment(calls: any[]): { positive: number; neutral: number; negative: number } {
  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  calls.forEach(call => {
    const score = call.call_analysis?.sentiment_score || 0;
    if (score > 0.3) sentiments.positive++;
    else if (score < -0.3) sentiments.negative++;
    else sentiments.neutral++;
  });
  
  const total = calls.length || 1;
  return {
    positive: Math.round((sentiments.positive / total) * 100),
    neutral: Math.round((sentiments.neutral / total) * 100),
    negative: Math.round((sentiments.negative / total) * 100)
  };
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}