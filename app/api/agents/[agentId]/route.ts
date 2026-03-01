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

    const agent = await retellClient.agent.retrieve(agentId) as any;
    
    // Log to see the actual agent structure (for debugging)
    console.log('Retrieved agent data:', {
      agent_id: agent.agent_id,
      has_prompt: !!agent.prompt,
      has_general_prompt: !!agent.general_prompt,
      has_begin_message: !!agent.begin_message,
      has_metadata: !!agent.metadata,
      metadata_keys: agent.metadata ? Object.keys(agent.metadata) : []
    });
    
    // Extract script data - check different possible locations
    let script = null;
    
    // Check if script is in metadata
    if (agent.metadata?.script) {
      script = agent.metadata.script;
    }
    // Check if there's a prompt field (common in Retell agents)
    else if (agent.prompt || agent.general_prompt) {
      script = {
        greeting: agent.begin_message || '',
        main_prompt: agent.prompt || agent.general_prompt || '',
        ending: agent.end_message || '',
        hold_message: '',
        voicemail: ''
      };
    }
    
    return NextResponse.json({
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      voice_id: agent.voice_id,
      language: agent.language,
      llm_websocket_url: agent.llm_websocket_url,
      response_engine: agent.response_engine,
      
      // Voice settings - only return actual values
      voice_temperature: agent.voice_temperature,
      voice_speed: agent.voice_speed,
      volume: agent.volume,
      
      // Interaction settings
      enable_backchannel: agent.enable_backchannel,
      backchannel_frequency: agent.backchannel_frequency,
      backchannel_words: agent.backchannel_words,
      
      interruption_sensitivity: agent.interruption_sensitivity,
      reminder_trigger_ms: agent.reminder_trigger_ms,
      reminder_max_count: agent.reminder_max_count,
      
      // Other settings
      webhook_url: agent.webhook_url,
      enable_recording: agent.enable_recording,
      metadata: agent.metadata || {},
      
      // Return actual script data if found
      script: script,
      
      // Include original prompt fields for reference
      prompt: agent.prompt,
      general_prompt: agent.general_prompt,
      begin_message: agent.begin_message,
      end_message: agent.end_message,
      
      settings: agent.metadata?.settings
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