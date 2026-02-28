import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// GET: トークフロー（Retell LLM）一覧を取得
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

    // Get all Retell LLMs
    const llms = await retellClient.llm.list() as any[];
    
    // Format for Japanese UI
    const formattedLLMs = llms.map((llm: any) => ({
      id: llm.llm_id,
      name: llm.llm_id, // LLM doesn't have a name field
      model: llm.model || 'gpt-4-turbo',
      created_at: llm.created_at || new Date().toISOString(),
      last_modified: llm.last_modified_at || new Date().toISOString(),
      
      // General settings
      general_prompt: llm.general_prompt || '',
      general_tools: llm.general_tools || [],
      
      // Begin message state
      begin_message: llm.states?.[0]?.messages?.[0]?.content || 'お電話ありがとうございます。',
      
      // State machine for conversation flow
      states: (llm.states || []).map((state: any) => ({
        name: state.name,
        messages: state.messages || [],
        edges: (state.edges || []).map((edge: any) => ({
          description: edge.description,
          destination: edge.destination_state_name,
          condition: edge.condition || '',
          parameters: edge.parameters || {}
        })),
        tools: state.tools || []
      })),
      
      // Inbound/Outbound settings
      starting_state: llm.starting_state || 'greeting',
      
      // Advanced settings
      tool_ids: llm.tool_ids || [],
    }));
    
    return NextResponse.json(formattedLLMs);
    
  } catch (error: any) {
    console.error('Get talk flow error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: 新しいトークフローを作成
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
      name, 
      model = 'gpt-4-turbo',
      general_prompt,
      begin_message,
      states,
      tools
    } = body;

    // Create Retell LLM with conversation flow
    const llm = await retellClient.llm.create({
      model,
      general_prompt: general_prompt || `あなたは日本語の電話受付AIアシスタントです。
以下のガイドラインに従って対応してください：

1. 丁寧で自然な日本語で話してください
2. お客様の名前と用件を確認してください
3. 必要に応じて担当者に取り次ぐか、折り返しの約束をしてください
4. 常に親切で忍耐強く対応してください`,
      
      // Define conversation states
      states: states || [
        {
          name: 'greeting',
          messages: [{
            role: 'system',
            content: 'Start the conversation with a polite greeting'
          }, {
            role: 'assistant', 
            content: begin_message || 'お電話ありがとうございます。どのようなご用件でしょうか？'
          }],
          edges: [
            {
              description: 'Customer states their purpose',
              destination_state_name: 'handle_request',
              condition: 'customer_stated_purpose'
            },
            {
              description: 'Customer asks for someone specific',
              destination_state_name: 'transfer',
              condition: 'requested_transfer'
            }
          ]
        },
        {
          name: 'handle_request',
          messages: [{
            role: 'system',
            content: 'Handle the customer request appropriately'
          }],
          edges: [
            {
              description: 'Request handled successfully',
              destination_state_name: 'closing',
              condition: 'request_completed'
            },
            {
              description: 'Need to transfer to human',
              destination_state_name: 'transfer',
              condition: 'transfer_needed'
            }
          ]
        },
        {
          name: 'transfer',
          messages: [{
            role: 'assistant',
            content: '担当者にお繋ぎいたします。少々お待ちください。'
          }],
          edges: [
            {
              description: 'Transfer completed',
              destination_state_name: 'end',
              condition: 'always'
            }
          ]
        },
        {
          name: 'closing',
          messages: [{
            role: 'assistant',
            content: 'お電話ありがとうございました。他にご不明な点はございませんか？'
          }],
          edges: [
            {
              description: 'Customer has more questions',
              destination_state_name: 'handle_request',
              condition: 'has_more_questions'
            },
            {
              description: 'Call ending',
              destination_state_name: 'end',
              condition: 'no_more_questions'
            }
          ]
        },
        {
          name: 'end',
          messages: [{
            role: 'assistant',
            content: 'お電話ありがとうございました。失礼いたします。'
          }],
          edges: []
        }
      ],
      
      starting_state: 'greeting',
      
      // Tools configuration
      general_tools: []
    } as any);

    return NextResponse.json({
      success: true,
      llm_id: llm.llm_id,
      message: 'トークフローを作成しました',
    });
    
  } catch (error: any) {
    console.error('Create talk flow error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: トークフローを更新
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
    const { llm_id, ...updateData } = body;

    if (!llm_id) {
      return NextResponse.json(
        { error: 'LLM ID is required' },
        { status: 400 }
      );
    }

    // Update Retell LLM
    const updatedLLM = await retellClient.llm.update(llm_id, {
      general_prompt: updateData.general_prompt,
      states: updateData.states,
      starting_state: updateData.starting_state,
      general_tools: updateData.general_tools,
    } as any);

    return NextResponse.json({
      success: true,
      llm_id: updatedLLM.llm_id,
      message: 'トークフローを更新しました',
    });
    
  } catch (error: any) {
    console.error('Update talk flow error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}