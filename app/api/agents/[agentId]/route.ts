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
    
    console.log(`[GET /api/agents/${agentId}] Agent retrieved:`, {
      agent_id: agent.agent_id,
      agent_name: agent.agent_name,
      response_engine_type: agent.response_engine?.type,
      llm_id: agent.response_engine?.llm_id
    });
    
    // Extract script data - check different possible locations
    let script = null;
    
    // Try to get LLM data if agent uses retell-llm
    if (agent.response_engine?.type === 'retell-llm' && agent.response_engine?.llm_id) {
      try {
        console.log(`[GET /api/agents/${agentId}] Fetching LLM with ID:`, agent.response_engine.llm_id);
        const llm = await retellClient.llm.retrieve(agent.response_engine.llm_id) as any;
        
        console.log(`[GET /api/agents/${agentId}] Retrieved LLM data:`, {
          llm_id: llm.llm_id,
          has_begin_message: !!llm.begin_message,
          begin_message_length: llm.begin_message?.length,
          has_general_prompt: !!llm.general_prompt,
          general_prompt_length: llm.general_prompt?.length,
          has_states: !!llm.states,
          states_count: llm.states?.length
        });
        
        // Extract script from LLM data
        script = {
          greeting: llm.begin_message || '',
          main_prompt: llm.general_prompt || '',
          ending: '', // May be in states
          hold_message: '',
          voicemail: ''
        };
        
        // Check if states have additional prompts
        if (llm.states && Array.isArray(llm.states)) {
          const mainState = llm.states.find((s: any) => s.name === 'main' || s.name === 'default');
          if (mainState?.prompt) {
            script.main_prompt = mainState.prompt;
          }
        }
        
        console.log(`[GET /api/agents/${agentId}] Script extracted:`, {
          has_greeting: !!script.greeting,
          greeting_length: script.greeting?.length,
          has_main_prompt: !!script.main_prompt,
          main_prompt_length: script.main_prompt?.length
        });
      } catch (llmError) {
        console.error(`[GET /api/agents/${agentId}] Failed to fetch LLM data:`, llmError);
      }
    } else {
      console.log(`[GET /api/agents/${agentId}] Agent does not use retell-llm or no LLM ID`);
    }
    
    // Fallback to checking agent metadata
    if (!script && agent.metadata?.script) {
      script = agent.metadata.script;
    }
    // Check if there's a prompt field directly on agent
    else if (!script && (agent.prompt || agent.general_prompt)) {
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