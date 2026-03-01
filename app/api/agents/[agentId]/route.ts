import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{
    agentId: string;
  }>;
}

// GET: Fetch single agent details
export async function GET(request: NextRequest, props: Params) {
  try {
    const params = await props.params;
    const { agentId } = params;
    
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    const agent = await retellClient.agent.get(agentId) as any;
    
    return NextResponse.json({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      voice_id: agent.voice_id,
      language: agent.language,
      llm_websocket_url: agent.llm_websocket_url,
      response_engine: agent.response_engine,
      
      // Voice settings
      voice_temperature: agent.voice_temperature || 0.7,
      voice_speed: agent.voice_speed || 1.0,
      volume: agent.volume || 1.0,
      
      // Interaction settings
      enable_backchannel: agent.enable_backchannel,
      backchannel_frequency: agent.backchannel_frequency,
      backchannel_words: agent.backchannel_words || [],
      
      interruption_sensitivity: agent.interruption_sensitivity || 0.5,
      reminder_trigger_ms: agent.reminder_trigger_ms,
      reminder_max_count: agent.reminder_max_count,
      
      // Other settings
      webhook_url: agent.webhook_url,
      enable_recording: agent.enable_recording,
      metadata: agent.metadata || {},
      
      // Custom fields for Japanese settings
      script: agent.metadata?.script || {
        greeting: '',
        main_prompt: '',
        ending: '',
        hold_message: '',
        voicemail: ''
      },
      settings: agent.metadata?.settings || {}
    });
    
  } catch (error: any) {
    console.error('Get agent error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update agent
export async function PUT(request: NextRequest, props: Params) {
  try {
    const params = await props.params;
    const { agentId } = params;
    
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
    
    // Update agent
    const agent = await retellClient.agent.update(agentId, body as any);

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

// DELETE: Delete agent
export async function DELETE(request: NextRequest, props: Params) {
  try {
    const params = await props.params;
    const { agentId } = params;
    
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    await retellClient.agent.delete(agentId);

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