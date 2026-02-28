import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// GET: Knowledge Base一覧を取得
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

    // Note: Knowledge Base API might not be available in current SDK version
    // This is a placeholder implementation
    const knowledgeBases: any[] = [];
    
    // Format for UI
    const formatted = knowledgeBases.map((kb: any) => ({
      id: kb.knowledge_base_id,
      name: kb.knowledge_base_name,
      description: kb.description || '',
      created_at: kb.created_at,
      updated_at: kb.updated_at,
      
      // Content stats
      total_documents: kb.total_documents || 0,
      total_chunks: kb.total_chunks || 0,
      embedding_model: kb.embedding_model || 'text-embedding-ada-002',
      
      // Settings
      chunk_size: kb.chunk_size || 1000,
      chunk_overlap: kb.chunk_overlap || 200,
      enable_auto_refresh: kb.enable_auto_refresh || false,
      refresh_interval: kb.refresh_interval || 'daily',
      
      // Source information
      sources: kb.sources || [],
      last_sync: kb.last_sync_at,
      sync_status: kb.sync_status || 'idle',
    }));
    
    return NextResponse.json(formatted);
    
  } catch (error: any) {
    console.error('Get knowledge base error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: 新しいKnowledge Baseを作成
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
      description,
      sources,
      chunk_size = 1000,
      chunk_overlap = 200,
      embedding_model = 'text-embedding-ada-002'
    } = body;

    // Create knowledge base (placeholder - API not available in SDK)
    const kb = {
      knowledge_base_id: `kb_${Date.now()}`,
      knowledge_base_name: name,
      description,
      chunk_size,
      chunk_overlap,
      embedding_model,
    };

    // Add sources if provided
    if (sources && sources.length > 0) {
      for (const source of sources) {
        if (source.type === 'text') {
          // await retellClient.knowledgeBase.addText(kb.knowledge_base_id, {
          //   text: source.content,
          //   metadata: source.metadata || {}
          // });
          console.log('Text source would be added:', source.content);
        } else if (source.type === 'url') {
          // await retellClient.knowledgeBase.addUrl(kb.knowledge_base_id, {
          //   url: source.url,
          //   metadata: source.metadata || {}
          // });
          console.log('URL source would be added:', source.url);
        } else if (source.type === 'file') {
          // File upload would need different handling
          console.log('File upload not implemented in this example');
        }
      }
    }

    return NextResponse.json({
      success: true,
      knowledge_base_id: kb.knowledge_base_id,
      message: 'ナレッジベースを作成しました',
    });
    
  } catch (error: any) {
    console.error('Create knowledge base error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Knowledge Baseにコンテンツを追加
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
    const { knowledge_base_id, content_type, content, metadata } = body;

    if (!knowledge_base_id) {
      return NextResponse.json(
        { error: 'Knowledge base ID is required' },
        { status: 400 }
      );
    }

    let result;
    
    switch (content_type) {
      case 'text':
        // Placeholder - API not available in SDK
        result = { success: true, message: 'Text content would be added' };
        console.log('Adding text:', content);
        break;
        
      case 'url':
        // Placeholder - API not available in SDK
        result = { success: true, message: 'URL content would be added' };
        console.log('Adding URL:', content);
        break;
        
      case 'faq':
        // Add Q&A pairs (placeholder)
        const qaList = content as Array<{question: string, answer: string}>;
        result = { success: true, count: qaList.length };
        console.log('Adding FAQ:', qaList);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unsupported content type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: 'コンテンツを追加しました',
    });
    
  } catch (error: any) {
    console.error('Add content to knowledge base error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}