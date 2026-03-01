import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check for API key before proceeding
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    // Initialize Retell client at runtime
    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const calls = await retellClient.call.list({ limit: 100 }) as any[];

    // Limit to the requested number
    const limitedCalls = calls.slice(0, limit);
    
    // Process calls with GPT summarization
    const formattedCalls = await Promise.all(limitedCalls.map(async (call) => {
      // Type-safe property access
      const phoneCall = call as any;
      const analysis = call.call_analysis as any;
      const transcript = call.transcript || '';
      const duration = (call.end_timestamp || 0) - (call.start_timestamp || 0);
      
      // Try to get GPT-generated summary if transcript exists
      let summary = analysis?.summary;
      let sentiment = analysis?.sentiment_score ? categorizeSentiment(analysis.sentiment_score) : 'neutral';
      let satisfactionScore = 70;
      let tags = [];
      let actionItems = [];
      
      if (transcript && !summary) {
        try {
          // Call GPT API for summary
          const summaryRes = await fetch(`${request.nextUrl.origin}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, type: 'summary' })
          });
          
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            summary = summaryData.summary;
          }
          
          // Get sentiment analysis
          const sentimentRes = await fetch(`${request.nextUrl.origin}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, type: 'sentiment' })
          });
          
          if (sentimentRes.ok) {
            const sentimentData = await sentimentRes.json();
            sentiment = sentimentData.sentiment || 'neutral';
            satisfactionScore = sentimentData.satisfaction_score || 70;
          }
          
          // Get tags
          const tagsRes = await fetch(`${request.nextUrl.origin}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, type: 'tags' })
          });
          
          if (tagsRes.ok) {
            const tagsData = await tagsRes.json();
            tags = tagsData.tags || [];
          }
          
          // Get action items
          const actionsRes = await fetch(`${request.nextUrl.origin}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, type: 'action_items' })
          });
          
          if (actionsRes.ok) {
            const actionsData = await actionsRes.json();
            actionItems = actionsData.action_items || [];
          }
        } catch (error) {
          console.error('GPT summarization error:', error);
          // Fall back to basic summarization
          summary = generateSummary(transcript);
          sentiment = analyzeSentiment(transcript);
          satisfactionScore = calculateSatisfaction(sentiment, transcript);
          tags = generateTags(transcript, summary);
          actionItems = extractActionItems(transcript);
        }
      } else {
        // Use fallback methods if no transcript or summary already exists
        summary = summary || generateSummary(transcript);
        sentiment = sentiment || analyzeSentiment(transcript);
        satisfactionScore = calculateSatisfaction(sentiment, transcript);
        tags = generateTags(transcript, summary);
        actionItems = extractActionItems(transcript);
      }
      
      // Extract issue type from conversation
      const issueType = extractIssueType(transcript);
      
      return {
        id: call.call_id,
        call_id: call.call_id,
        time: formatTime(call.start_timestamp || Date.now()),
        start_timestamp: call.start_timestamp,
        end_timestamp: call.end_timestamp,
        from: phoneCall.from_number || phoneCall.from_phone_number || 'Unknown',
        from_number: phoneCall.from_number || phoneCall.from_phone_number,
        to: phoneCall.to_number || phoneCall.to_phone_number || 'Unknown',
        to_number: phoneCall.to_number || phoneCall.to_phone_number,
        duration: formatDuration(duration),
        duration_ms: duration,
        status: mapCallStatus(call.call_status || 'unknown'),
        call_status: call.call_status,
        sentiment: sentiment,
        satisfaction_score: satisfactionScore,
        summary: summary,
        purpose: analysis?.intent || issueType.category || 'お問い合わせ',
        transcript: transcript,
        recording_url: call.recording_url || null,
        analysis: analysis || null,
        tags: tags,
        issue_type: issueType,
        action_items: actionItems,
        metadata: {
          agent_id: call.agent_id,
          agent_name: call.agent_name || 'AI受付',
          call_type: call.call_type || 'inbound',
          disconnection_reason: call.disconnection_reason
        }
      };
    }));

    return NextResponse.json(formattedCalls);
  } catch (error: any) {
    console.error('Recent calls error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function mapCallStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'ended': 'completed',
    'error': 'failed',
    'in-progress': 'active',
    'transferred': 'transferred'
  };
  return statusMap[status] || status;
}

function categorizeSentiment(score: number) {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  return 'neutral';
}

// Generate summary from transcript
function generateSummary(transcript: string): string {
  if (!transcript) return '通話記録がありません';
  
  const lines = transcript.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '通話記録がありません';
  
  // Extract key points from conversation
  const keywords = ['問い合わせ', '不具合', '予約', '変更', 'キャンセル', '確認', '申込み', '質問'];
  const foundKeywords = keywords.filter(kw => transcript.includes(kw));
  
  // Get first customer statement
  const customerLines = lines.filter(line => line.includes('お客様:') || !line.includes('AI:'));
  const firstCustomerStatement = customerLines[0]?.replace(/.*お客様:/, '').trim() || '';
  
  if (foundKeywords.length > 0) {
    return `${foundKeywords[0]}に関する対応。${firstCustomerStatement.substring(0, 50)}...`;
  }
  
  return firstCustomerStatement.substring(0, 100) || '一般的なお問い合わせ';
}

// Analyze sentiment from transcript text
function analyzeSentiment(transcript: string): string {
  if (!transcript) return 'neutral';
  
  const positiveWords = ['ありがとう', '助かり', '良い', '素晴らしい', '満足', '嬉しい', '解決'];
  const negativeWords = ['困っ', '不満', '怒', '悪い', '最悪', 'ダメ', '遅い', '使えない'];
  
  const positiveCount = positiveWords.filter(word => transcript.includes(word)).length;
  const negativeCount = negativeWords.filter(word => transcript.includes(word)).length;
  
  if (positiveCount > negativeCount * 2) return 'positive';
  if (negativeCount > positiveCount * 2) return 'negative';
  return 'neutral';
}

// Generate relevant tags from transcript and summary
function generateTags(transcript: string, summary: string): string[] {
  const tags = [];
  const content = (transcript + ' ' + summary).toLowerCase();
  
  // Service type tags
  if (content.includes('製品') || content.includes('商品')) tags.push('製品サポート');
  if (content.includes('不具合') || content.includes('故障')) tags.push('技術的問題');
  if (content.includes('予約') || content.includes('申込')) tags.push('予約・申込');
  if (content.includes('キャンセル') || content.includes('取消')) tags.push('キャンセル');
  if (content.includes('料金') || content.includes('価格')) tags.push('料金問い合わせ');
  if (content.includes('配送') || content.includes('発送')) tags.push('配送関連');
  
  // Resolution tags
  if (content.includes('解決') || content.includes('直り')) tags.push('解決済み');
  if (content.includes('対応中') || content.includes('確認中')) tags.push('対応中');
  
  // Priority tags
  if (content.includes('至急') || content.includes('緊急')) tags.push('緊急');
  
  // If no tags, add a default one
  if (tags.length === 0) tags.push('一般問い合わせ');
  
  return tags;
}

// Extract issue type from conversation
function extractIssueType(transcript: string) {
  const issueCategories = {
    '技術サポート': ['不具合', '故障', 'エラー', '動かない', '壊れ'],
    '注文・予約': ['予約', '注文', '申込', '購入'],
    '変更・キャンセル': ['変更', 'キャンセル', '取消', '修正'],
    '料金・支払い': ['料金', '価格', '支払', '請求'],
    '配送・納期': ['配送', '発送', '届', '納期'],
    '製品情報': ['仕様', 'スペック', '機能', '使い方'],
    'アカウント': ['ログイン', 'パスワード', 'アカウント'],
    'その他': []
  };
  
  let category = 'その他';
  let subCategory = '一般';
  
  for (const [cat, keywords] of Object.entries(issueCategories)) {
    if (keywords.some(kw => transcript.includes(kw))) {
      category = cat;
      subCategory = keywords.find(kw => transcript.includes(kw)) || '一般';
      break;
    }
  }
  
  return {
    category,
    subCategory,
    priority: transcript.includes('至急') || transcript.includes('緊急') ? 'high' : 'normal'
  };
}

// Calculate satisfaction score
function calculateSatisfaction(sentiment: string, transcript: string): number {
  let score = 70; // Base score
  
  // Adjust based on sentiment
  if (sentiment === 'positive') score += 20;
  if (sentiment === 'negative') score -= 20;
  
  // Adjust based on resolution
  if (transcript.includes('解決') || transcript.includes('ありがとう')) score += 10;
  if (transcript.includes('まだ') || transcript.includes('できない')) score -= 10;
  
  // Keep within 0-100 range
  return Math.max(0, Math.min(100, score));
}

// Extract action items from transcript
function extractActionItems(transcript: string): string[] {
  const actionItems: string[] = [];
  const lines = transcript.split('\n');
  
  const actionKeywords = ['確認します', '送ります', '連絡します', '手配します', '対応します'];
  
  lines.forEach(line => {
    if (line.includes('AI:') && actionKeywords.some(kw => line.includes(kw))) {
      const action = line.replace(/.*AI:/, '').trim();
      if (action.length > 10 && action.length < 100) {
        actionItems.push(action);
      }
    }
  });
  
  return actionItems;
}