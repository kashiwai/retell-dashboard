import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    
    if (!process.env.RETELL_API_KEY) {
      return NextResponse.json(
        { error: 'Retell API key not configured' },
        { status: 500 }
      );
    }

    const retellClient = new Retell({ 
      apiKey: process.env.RETELL_API_KEY 
    });

    // Get the call data
    const call = await retellClient.call.retrieve(callId) as any;
    
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const transcript = call.transcript || '';
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript available for this call' },
        { status: 400 }
      );
    }

    // Get detailed GPT analysis
    const detailedRes = await fetch(`${request.nextUrl.origin}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, type: 'detailed' })
    });
    
    let detailedInfo = null;
    let summary = '';
    
    if (detailedRes.ok) {
      detailedInfo = await detailedRes.json();
      summary = detailedInfo.summary || detailedInfo.requirement;
    }
    
    // Get sentiment analysis
    const sentimentRes = await fetch(`${request.nextUrl.origin}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, type: 'sentiment' })
    });
    
    let sentiment = 'neutral';
    let satisfactionScore = 70;
    
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
    
    let tags: string[] = [];
    
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
    
    let actionItems: string[] = [];
    
    if (actionsRes.ok) {
      const actionsData = await actionsRes.json();
      actionItems = actionsData.action_items || [];
    }

    return NextResponse.json({
      summary,
      sentiment,
      satisfaction_score: satisfactionScore,
      tags,
      action_items: actionItems,
      customer_name: detailedInfo?.customer_name || '不明',
      phone_number: detailedInfo?.phone_number || '',
      requirement: detailedInfo?.requirement || summary,
      details: detailedInfo?.details || '',
      urgency: detailedInfo?.urgency || '中',
      response_status: detailedInfo?.status || '未対応'
    });
    
  } catch (error: any) {
    console.error('Call summarization error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}