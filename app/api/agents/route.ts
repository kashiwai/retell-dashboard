import { NextRequest, NextResponse } from 'next/server';
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
    const agents = await retellClient.agent.list() as any[];
    
    // Get today's calls for each agent
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const calls = await retellClient.call.list({ limit: 500 }) as any[];
    
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

// POST: Create a new agent
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
    const { 
      agent_name, 
      voice_id, 
      language = 'ja',
      llm_websocket_url,
      response_engine
    } = body;

    // Create agent with Japanese defaults
    const agent = await retellClient.agent.create({
      agent_name: agent_name || '新規エージェント',
      voice_id: voice_id || '11labs-Adrian',
      language: language,
      llm_websocket_url: llm_websocket_url,
      
      // Japanese-specific settings
      response_engine: response_engine || {
        type: 'retell_llm',
        llm_id: body.llm_id || null
      },
      
      // Voice settings optimized for Japanese
      voice_temperature: 0.7,
      voice_speed: 1.0,
      volume: 1.0,
      
      // Interaction settings
      enable_backchannel: true,
      backchannel_frequency: 0.7,
      backchannel_words: ['はい', 'ええ', 'そうですね', 'なるほど'],
      
      reminder_trigger_ms: 8000,
      reminder_max_count: 2,
      
      interruption_sensitivity: 0.5,
      ambient_sound_volume: 0.3,
      
      // Optional webhook
      webhook_url: body.webhook_url || null,
      
      // Enable call recording
      enable_recording: true,
      
      // Optional custom metadata
      metadata: body.metadata || {}
    } as any);

    return NextResponse.json({
      success: true,
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      message: 'エージェントを作成しました'
    });
    
  } catch (error: any) {
    console.error('Create agent error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update an agent
export async function PUT(request: NextRequest) {
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
    const { agent_id, ...updateData } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Update agent
    const agent = await retellClient.agent.update(agent_id, updateData as any);

    return NextResponse.json({
      success: true,
      agent_id: agent.agent_id,
      message: 'エージェントを更新しました'
    });
    
  } catch (error: any) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete an agent
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Delete agent
    await retellClient.agent.delete(agent_id);

    return NextResponse.json({
      success: true,
      message: 'エージェントを削除しました'
    });
    
  } catch (error: any) {
    console.error('Delete agent error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}