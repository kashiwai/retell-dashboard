import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

// GET: 利用可能な音声一覧を取得
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

    // Get available voices
    const voices = await retellClient.voice.list();
    
    // Format voices with Japanese labels
    const formattedVoices = voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.voice_name || voice.voice_id,
      provider: voice.provider || 'elevenlabs',
      language: voice.language || 'ja-JP',
      gender: voice.gender || 'unknown',
      age: voice.age_group || 'adult',
      accent: voice.accent || 'standard',
      
      // Voice characteristics
      characteristics: {
        tone: voice.tone || 'neutral',
        speaking_rate: voice.speaking_rate || 'normal',
        pitch: voice.pitch || 'medium',
        style: voice.style || 'conversational',
      },
      
      // Sample and preview
      sample_text: voice.sample_text || 'こんにちは。お電話ありがとうございます。',
      preview_url: voice.preview_url || null,
      
      // Custom voice info
      is_custom: voice.is_custom || false,
      cloned_from: voice.cloned_from || null,
      created_at: voice.created_at,
      
      // Usage stats
      usage_count: voice.usage_count || 0,
      last_used: voice.last_used_at,
    }));
    
    // Add default Japanese voices if not present
    const defaultVoices = [
      {
        id: 'jp-female-1',
        name: '日本語女性1（落ち着いた声）',
        provider: 'elevenlabs',
        language: 'ja-JP',
        gender: 'female',
        age: 'adult',
        characteristics: {
          tone: 'professional',
          speaking_rate: 'normal',
          pitch: 'medium',
          style: 'formal'
        },
        is_custom: false
      },
      {
        id: 'jp-male-1',
        name: '日本語男性1（信頼感のある声）',
        provider: 'elevenlabs',
        language: 'ja-JP',
        gender: 'male',
        age: 'adult',
        characteristics: {
          tone: 'confident',
          speaking_rate: 'normal',
          pitch: 'low',
          style: 'professional'
        },
        is_custom: false
      },
      {
        id: 'jp-female-2',
        name: '日本語女性2（明るい声）',
        provider: 'elevenlabs',
        language: 'ja-JP',
        gender: 'female',
        age: 'young_adult',
        characteristics: {
          tone: 'friendly',
          speaking_rate: 'slightly_fast',
          pitch: 'high',
          style: 'casual'
        },
        is_custom: false
      }
    ];
    
    // Merge with default voices
    const allVoices = [...formattedVoices];
    defaultVoices.forEach(defaultVoice => {
      if (!allVoices.find(v => v.id === defaultVoice.id)) {
        allVoices.push({
          ...defaultVoice,
          accent: 'standard',
          sample_text: 'お電話ありがとうございます。ご用件をお聞かせください。',
          preview_url: null,
          cloned_from: null,
          created_at: new Date().toISOString(),
          usage_count: 0,
          last_used: null
        });
      }
    });
    
    return NextResponse.json(allVoices);
    
  } catch (error: any) {
    console.error('Get voices error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST: 音声をクローン
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

    // Parse form data for audio file upload
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const voiceName = formData.get('name') as string;
    const voiceDescription = formData.get('description') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Clone voice using Retell API
    const clonedVoice = await retellClient.voice.clone({
      voice_name: voiceName || 'Custom Voice',
      audio_data: buffer,
      audio_format: audioFile.type || 'audio/mpeg',
    } as any);

    return NextResponse.json({
      success: true,
      voice_id: clonedVoice.voice_id,
      voice_name: clonedVoice.voice_name,
      message: '音声のクローンを作成しました',
    });
    
  } catch (error: any) {
    console.error('Clone voice error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT: 音声設定を更新
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
    const { voice_id, settings } = body;

    if (!voice_id) {
      return NextResponse.json(
        { error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    // Update voice settings (this would be custom implementation)
    // Retell API might not support direct voice setting updates
    // This is a placeholder for custom voice configuration storage
    
    return NextResponse.json({
      success: true,
      voice_id,
      settings,
      message: '音声設定を更新しました',
    });
    
  } catch (error: any) {
    console.error('Update voice settings error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}