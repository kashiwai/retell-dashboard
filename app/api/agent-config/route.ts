import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// GET: エージェント設定を取得
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get agent configuration
    const agent = await retellClient.agent.retrieve(agentId) as any;
    
    // Format agent configuration with Japanese labels
    const config = {
      basic: {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        voice_id: agent.voice_id,
        language: agent.language,
        voice_speed: agent.voice_speed || 1.0,
        voice_temperature: agent.voice_temperature || 0.7,
        response_speed: agent.response_speed || 'balanced',
      },
      greeting: {
        begin_message: agent.begin_message || 'お電話ありがとうございます。',
        end_message: agent.end_message || 'お電話ありがとうございました。',
        general_prompt: agent.general_prompt || '',
      },
      conversation_flow: {
        llm_id: agent.llm_id,
        llm_model: agent.llm_model || 'gpt-4',
        max_call_duration: agent.max_call_duration || 1800,
        interruption_sensitivity: agent.interruption_sensitivity || 0.5,
        enable_backchannel: agent.enable_backchannel !== false,
        ambient_sound: agent.ambient_sound || 'office',
        webhook_url: agent.webhook_url || '',
      },
      response_settings: {
        responsiveness: agent.responsiveness || 0.5,
        boosted_keywords: agent.boosted_keywords || [],
        reminder_trigger_ms: agent.reminder_trigger_ms || 10000,
        reminder_message: agent.reminder_message || 'お客様、まだいらっしゃいますか？',
      },
      tools: agent.tools || [],
      metadata: agent.metadata || {},
    };

    return NextResponse.json(config);
    
  } catch (error: any) {
    console.error('Get agent config error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: エージェント設定を更新
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
    const { agent_id, ...updateData } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Update agent configuration (only update supported fields)
    const updatedAgent = await retellClient.agent.update(agent_id, {
      agent_name: updateData.agent_name,
      voice_id: updateData.voice_id,
      language: updateData.language,
      voice_speed: updateData.voice_speed,
      voice_temperature: updateData.voice_temperature,
      general_prompt: updateData.general_prompt,
      begin_message: updateData.begin_message,
      end_message: updateData.end_message,
      max_call_duration: updateData.max_call_duration,
      boosted_keywords: updateData.boosted_keywords,
      interruption_sensitivity: updateData.interruption_sensitivity,
      enable_backchannel: updateData.enable_backchannel,
      ambient_sound: updateData.ambient_sound,
      responsiveness: updateData.responsiveness,
      reminder_trigger_ms: updateData.reminder_trigger_ms,
      reminder_message: updateData.reminder_message,
      webhook_url: updateData.webhook_url,
      metadata: updateData.metadata,
    } as any);

    return NextResponse.json({
      success: true,
      agent_id: updatedAgent.agent_id,
      message: 'エージェント設定を更新しました',
    });
    
  } catch (error: any) {
    console.error('Update agent config error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}