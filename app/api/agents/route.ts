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

    // Get agents list
    const agents = await retellClient.agent.list({ limit: 100 });
    
    // Get today's calls for each agent
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const calls = await retellClient.call.list({ limit: 500 });
    
    // Count calls per agent
    const agentCallCounts = new Map<string, number>();
    calls.forEach(call => {
      if (!call.start_timestamp) return;
      const callDate = new Date(call.start_timestamp);
      if (callDate >= today && call.agent_id) {
        const count = agentCallCounts.get(call.agent_id) || 0;
        agentCallCounts.set(call.agent_id, count + 1);
      }
    });
    
    // Format agents data
    const formattedAgents = agents.map(agent => ({
      id: agent.agent_id,
      name: agent.agent_name || 'Unnamed Agent',
      status: 'active', // Retell doesn't provide real-time status
      calls_today: agentCallCounts.get(agent.agent_id) || 0,
      voice: agent.voice_id || 'Default',
      lang: agent.language || 'ja-JP'
    }));
    
    return NextResponse.json(formattedAgents);
    
  } catch (error: any) {
    console.error('Agents error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}