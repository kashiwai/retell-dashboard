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

    // Get last 7 days of data
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all calls
    const calls = await retellClient.call.list({ limit: 1000 });
    
    // Process daily statistics
    const dailyStats = new Map<string, { calls: number; minutes: number }>();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      dailyStats.set(dateStr, { calls: 0, minutes: 0 });
    }
    
    // Calculate statistics for each day
    calls.forEach(call => {
      if (!call.start_timestamp) return;
      
      const callDate = new Date(call.start_timestamp);
      if (callDate < sevenDaysAgo) return;
      
      const dateStr = `${callDate.getMonth() + 1}/${callDate.getDate()}`;
      const stats = dailyStats.get(dateStr);
      
      if (stats) {
        stats.calls++;
        const duration = (call.end_timestamp || 0) - (call.start_timestamp || 0);
        stats.minutes += Math.round(duration / 60000);
      }
    });
    
    // Convert to array format for charts
    const callsData = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        calls: stats.calls,
        minutes: stats.minutes
      }))
      .reverse();
    
    // Calculate hourly distribution for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hourlyStats = new Array(24).fill(0);
    calls.forEach(call => {
      if (!call.start_timestamp) return;
      const callDate = new Date(call.start_timestamp);
      if (callDate >= today) {
        const hour = callDate.getHours();
        hourlyStats[hour]++;
      }
    });
    
    const hourlyData = hourlyStats.map((calls, hour) => ({
      hour: `${hour}時`,
      calls
    }));
    
    // Calculate sentiment distribution
    let positive = 0, neutral = 0, negative = 0;
    calls.forEach(call => {
      const analysis = call.call_analysis as any;
      const score = analysis?.sentiment_score || 0;
      
      if (score > 0.3) positive++;
      else if (score < -0.3) negative++;
      else neutral++;
    });
    
    const total = calls.length || 1;
    const sentimentData = [
      { name: "ポジティブ", value: Math.round((positive / total) * 100), color: "#10b981" },
      { name: "ニュートラル", value: Math.round((neutral / total) * 100), color: "#6b7280" },
      { name: "ネガティブ", value: Math.round((negative / total) * 100), color: "#ef4444" }
    ];
    
    return NextResponse.json({
      callsData,
      hourlyData,
      sentimentData
    });
    
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}