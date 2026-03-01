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
    
  } catch (error: any) {
    console.error('Get LLM error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}