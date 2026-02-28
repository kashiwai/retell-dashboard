import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// GET: 利用可能なMCPツール一覧を取得
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

    // Get available MCP tools from Retell (placeholder - API not available)
    const mcpTools: any[] = [];
    
    // Format MCP tools with Japanese descriptions
    const formattedTools = mcpTools.map((tool: any) => ({
      id: tool.tool_id,
      name: tool.name,
      type: tool.type,
      description: getJapaneseDescription(tool.type, tool.name),
      configuration: tool.configuration || {},
      
      // Tool-specific configurations
      ...(tool.type === 'mcp_computer_tool' && {
        provider: tool.provider || 'anthropic',
        capabilities: ['screenshot', 'type', 'click', 'scroll'],
        description: 'コンピュータを制御してタスクを実行',
      }),
      
      ...(tool.type === 'mcp_filesystem_tool' && {
        allowed_paths: tool.allowed_paths || [],
        operations: ['read', 'write', 'list'],
        description: 'ファイルシステムへのアクセスと操作',
      }),
      
      ...(tool.type === 'mcp_weather_tool' && {
        api_key: tool.api_key ? '設定済み' : '未設定',
        description: '天気情報の取得',
      }),
      
      ...(tool.type === 'mcp_calendar_tool' && {
        integration: tool.integration || 'google',
        description: 'カレンダーの予約と管理',
      }),
      
      ...(tool.type === 'mcp_email_tool' && {
        provider: tool.provider || 'gmail',
        description: 'メール送信と管理',
      }),
      
      ...(tool.type === 'mcp_database_tool' && {
        database_type: tool.database_type || 'postgresql',
        description: 'データベースへのクエリ実行',
      }),
      
      ...(tool.type === 'mcp_slack_tool' && {
        workspace: tool.workspace || '',
        description: 'Slackメッセージの送信',
      }),
      
      ...(tool.type === 'mcp_search_tool' && {
        search_engine: tool.search_engine || 'google',
        description: 'Web検索の実行',
      }),
      
      enabled: tool.enabled !== false,
      created_at: tool.created_at,
    }));
    
    // Add recommended MCP tools if not already configured
    const recommendedTools = [
      {
        id: 'mcp-calendar',
        name: 'Calendar Integration',
        type: 'mcp_calendar_tool',
        description: '予約の確認と登録を自動化',
        enabled: false,
        configuration: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'mcp-crm',
        name: 'CRM Integration',
        type: 'mcp_database_tool',
        description: '顧客情報の照会と更新',
        enabled: false,
        configuration: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'mcp-email',
        name: 'Email Automation',
        type: 'mcp_email_tool',
        description: '問い合わせ内容のメール送信',
        enabled: false,
        configuration: {},
        created_at: new Date().toISOString(),
      },
      {
        id: 'mcp-slack',
        name: 'Slack Notification',
        type: 'mcp_slack_tool',
        description: '重要な通話をSlackに通知',
        enabled: false,
        configuration: {},
        created_at: new Date().toISOString(),
      },
    ];
    
    // Merge existing and recommended tools
    const allTools = [...formattedTools];
    recommendedTools.forEach(recTool => {
      if (!allTools.find(t => t.type === recTool.type)) {
        allTools.push(recTool);
      }
    });
    
    return NextResponse.json(allTools);
    
  } catch (error: any) {
    console.error('Get MCP tools error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: MCPツールを設定/有効化
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
    const { tool_type, configuration, enabled = true } = body;

    // Create or update MCP tool (placeholder - API not available)
    const tool = {
      tool_id: `tool_${Date.now()}`,
      type: tool_type,
      name: getToolName(tool_type),
      configuration: configuration || {},
      enabled,
    };

    return NextResponse.json({
      success: true,
      tool_id: tool.tool_id,
      message: 'MCPツールを設定しました',
    });
    
  } catch (error: any) {
    console.error('Configure MCP tool error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function getJapaneseDescription(type: string, name: string): string {
  const descriptions: Record<string, string> = {
    mcp_computer_tool: 'コンピュータを制御してタスクを自動実行',
    mcp_filesystem_tool: 'ファイルの読み書きとディレクトリ操作',
    mcp_weather_tool: '天気予報と気象情報の取得',
    mcp_calendar_tool: 'カレンダーの予約確認と登録',
    mcp_email_tool: 'メールの自動送信と管理',
    mcp_database_tool: 'データベースへの接続とクエリ実行',
    mcp_slack_tool: 'Slackワークスペースへのメッセージ送信',
    mcp_search_tool: 'インターネット検索の実行',
    mcp_translation_tool: '多言語翻訳サービス',
    mcp_payment_tool: '決済処理と請求管理',
    mcp_sms_tool: 'SMS送信サービス',
    mcp_location_tool: '位置情報と地図サービス',
  };
  
  return descriptions[type] || `${name} - MCP Tool`;
}

function getToolName(type: string): string {
  const names: Record<string, string> = {
    mcp_computer_tool: 'Computer Control',
    mcp_filesystem_tool: 'File System',
    mcp_weather_tool: 'Weather Service',
    mcp_calendar_tool: 'Calendar Integration',
    mcp_email_tool: 'Email Service',
    mcp_database_tool: 'Database Connection',
    mcp_slack_tool: 'Slack Integration',
    mcp_search_tool: 'Web Search',
    mcp_translation_tool: 'Translation Service',
    mcp_payment_tool: 'Payment Processing',
    mcp_sms_tool: 'SMS Service',
    mcp_location_tool: 'Location Service',
  };
  
  return names[type] || type;
}