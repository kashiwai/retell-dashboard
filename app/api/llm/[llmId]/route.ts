import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{
    llmId: string;
  }>;
}

// GET: Fetch LLM details
export async function GET(request: NextRequest, props: Params) {
  try {
    const params = await props.params;
    const { llmId } = params;
    
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    const llm = await retellClient.llm.retrieve(llmId) as any;
    
    return NextResponse.json({
      llm_id: llm.llm_id,
      begin_message: llm.begin_message,
      general_prompt: llm.general_prompt,
      general_tools: llm.general_tools,
      states: llm.states,
      ...llm
    });

  } catch (error: unknown) {
    console.error('Get LLM error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH: プロンプトを更新
export async function PATCH(request: NextRequest, props: Params) {
  try {
    const params = await props.params
    const { llmId } = params
    const { general_prompt, begin_message } = await request.json()

    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json({ error: 'Retell API key not configured' }, { status: 500 })
    }

    const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY })
    const updates: { general_prompt?: string; begin_message?: string } = {}
    if (general_prompt !== undefined) updates.general_prompt = general_prompt
    if (begin_message !== undefined) updates.begin_message = begin_message

    const updated = await retellClient.llm.update(llmId, updates)
    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Update LLM error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}