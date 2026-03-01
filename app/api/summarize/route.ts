import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { transcript, type = 'summary' } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      // If no OpenAI API key, use fallback summarization
      const fallbackSummary = generateFallbackSummary(transcript, type);
      return NextResponse.json(fallbackSummary);
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'summary':
        systemPrompt = `あなたは日本語の通話内容を要約する専門家です。重要なポイントを簡潔にまとめてください。`;
        userPrompt = `以下の通話記録を50-100文字程度で要約してください。重要な問題、解決方法、結果を含めてください：\n\n${transcript}`;
        break;
      
      case 'sentiment':
        systemPrompt = `あなたは感情分析の専門家です。通話の感情を分析してください。`;
        userPrompt = `以下の通話記録の顧客の感情を分析し、positive/neutral/negativeのいずれかと、0-100の満足度スコアを返してください：\n\n${transcript}\n\n以下の形式で回答してください：\n感情: [positive/neutral/negative]\n満足度: [0-100の数値]`;
        break;
      
      case 'tags':
        systemPrompt = `あなたはタグ分類の専門家です。通話内容から適切なタグを生成してください。`;
        userPrompt = `以下の通話記録から関連するタグを3-5個生成してください。カンマ区切りで返してください：\n\n${transcript}`;
        break;
      
      case 'action_items':
        systemPrompt = `あなたはアクションアイテム抽出の専門家です。`;
        userPrompt = `以下の通話記録から、対応が必要なアクションアイテムを抽出してください。箇条書きで返してください：\n\n${transcript}`;
        break;
      
      case 'detailed':
        systemPrompt = `あなたは日本語の通話内容を詳細に分析する専門家です。重要な情報を正確に抽出してください。`;
        userPrompt = `以下の通話記録を分析して、次の情報を抽出してください：

${transcript}

必ず以下の形式で回答してください：
電話番号: [通話中に言及された電話番号、なければ「不明」]
名前: [お客様の名前、なければ「不明」]
要件: [主な要件・用件を50文字以内で要約]
詳細: [詳細な内容を100文字以内で要約]
緊急度: [高/中/低のいずれか]
対応状況: [解決済み/対応中/保留/未対応のいずれか]

緊急度の判断基準：
- 高: 至急、緊急、今すぐ、大至急などの言葉がある、または深刻な問題
- 中: 早めに、なるべく早く、できれば今日中などの言葉がある
- 低: 特に急ぎではない、時間がある時で良い`;
        break;
      
      default:
        systemPrompt = `あなたは日本語の通話内容を分析する専門家です。`;
        userPrompt = transcript;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const result = completion.choices[0].message.content || '';

    // Parse the result based on type
    let response: any = {};
    
    switch (type) {
      case 'summary':
        response = { summary: result };
        break;
      
      case 'sentiment':
        const lines = result.split('\n');
        const sentimentLine = lines.find(l => l.includes('感情:'));
        const scoreLine = lines.find(l => l.includes('満足度:'));
        
        response = {
          sentiment: sentimentLine?.replace(/.*:\s*/, '').toLowerCase() || 'neutral',
          satisfaction_score: parseInt(scoreLine?.replace(/.*:\s*/, '') || '70')
        };
        break;
      
      case 'tags':
        response = { 
          tags: result.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) 
        };
        break;
      
      case 'action_items':
        response = { 
          action_items: result.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^[-•*]\s*/, ''))
        };
        break;
      
      case 'detailed':
        const detailLines = result.split('\n');
        const phoneNumberLine = detailLines.find(l => l.includes('電話番号:'));
        const nameLine = detailLines.find(l => l.includes('名前:'));
        const requirementLine = detailLines.find(l => l.includes('要件:'));
        const detailLine = detailLines.find(l => l.includes('詳細:'));
        const urgencyLine = detailLines.find(l => l.includes('緊急度:'));
        const statusLine = detailLines.find(l => l.includes('対応状況:'));
        
        response = {
          phone_number: phoneNumberLine?.replace(/.*:\s*/, '').trim() || '不明',
          customer_name: nameLine?.replace(/.*:\s*/, '').trim() || '不明',
          requirement: requirementLine?.replace(/.*:\s*/, '').trim() || '不明',
          details: detailLine?.replace(/.*:\s*/, '').trim() || '',
          urgency: urgencyLine?.replace(/.*:\s*/, '').trim() || '中',
          status: statusLine?.replace(/.*:\s*/, '').trim() || '未対応',
          summary: requirementLine?.replace(/.*:\s*/, '').trim() || '通話内容の要約'
        };
        break;
      
      default:
        response = { result };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Summarization error:', error);
    
    // Fallback to basic summarization
    const { transcript, type = 'summary' } = await request.json();
    const fallbackSummary = generateFallbackSummary(transcript, type);
    return NextResponse.json(fallbackSummary);
  }
}

// Fallback summarization without GPT
function generateFallbackSummary(transcript: string, type: string): any {
  if (!transcript) {
    return { error: 'No transcript provided' };
  }

  const lines = transcript.split('\n').filter(line => line.trim());
  
  switch (type) {
    case 'summary':
      // Extract first customer statement and key points
      const customerLines = lines.filter(line => !line.includes('AI:'));
      const firstIssue = customerLines[0]?.substring(0, 100) || '通話記録なし';
      
      // Look for keywords
      const keywords = ['問い合わせ', '不具合', '予約', '変更', 'キャンセル', '確認', '申込み', '質問'];
      const foundKeyword = keywords.find(kw => transcript.includes(kw));
      
      const summary = foundKeyword 
        ? `${foundKeyword}に関する対応。${firstIssue}`
        : firstIssue;
      
      return { summary };

    case 'sentiment':
      const positiveWords = ['ありがとう', '助かり', '良い', '素晴らしい', '満足', '嬉しい', '解決'];
      const negativeWords = ['困っ', '不満', '怒', '悪い', '最悪', 'ダメ', '遅い', '使えない'];
      
      const positiveCount = positiveWords.filter(word => transcript.includes(word)).length;
      const negativeCount = negativeWords.filter(word => transcript.includes(word)).length;
      
      let sentiment = 'neutral';
      let satisfaction_score = 70;
      
      if (positiveCount > negativeCount * 2) {
        sentiment = 'positive';
        satisfaction_score = 85 + (positiveCount * 5);
      } else if (negativeCount > positiveCount * 2) {
        sentiment = 'negative';
        satisfaction_score = 50 - (negativeCount * 5);
      }
      
      return { 
        sentiment, 
        satisfaction_score: Math.max(0, Math.min(100, satisfaction_score))
      };

    case 'tags':
      const tags: string[] = [];
      
      // Service type tags
      if (transcript.includes('製品') || transcript.includes('商品')) tags.push('製品サポート');
      if (transcript.includes('不具合') || transcript.includes('故障')) tags.push('技術的問題');
      if (transcript.includes('予約') || transcript.includes('申込')) tags.push('予約・申込');
      if (transcript.includes('キャンセル') || transcript.includes('取消')) tags.push('キャンセル');
      if (transcript.includes('料金') || transcript.includes('価格')) tags.push('料金問い合わせ');
      
      // Resolution tags
      if (transcript.includes('解決') || transcript.includes('直り')) tags.push('解決済み');
      if (transcript.includes('対応中') || transcript.includes('確認中')) tags.push('対応中');
      
      // If no tags, add default
      if (tags.length === 0) tags.push('一般問い合わせ');
      
      return { tags };

    case 'action_items':
      const actionItems: string[] = [];
      const actionKeywords = ['確認します', '送ります', '連絡します', '手配します', '対応します'];
      
      lines.forEach(line => {
        if (line.includes('AI:') && actionKeywords.some(kw => line.includes(kw))) {
          const action = line.replace(/.*AI:/, '').trim();
          if (action.length > 10 && action.length < 100) {
            actionItems.push(action);
          }
        }
      });
      
      return { action_items: actionItems };

    default:
      return { result: transcript.substring(0, 200) };
  }
}