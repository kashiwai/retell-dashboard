import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { pushLineMessage } from '@/lib/notify/line';

export const dynamic = 'force-dynamic';

// 個人受電代行サービス(共有テンプレートagent)専用のcall_analyzed webhook。
// owner_id(inbound webhookがmetadataに埋めたもの) or to_number でDBから依頼主を引き、
// LINEへpush通知する。app/api/webhook/retell/route.tsの静的agent_idマップとは別経路。
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.event || payload.type || payload.event_type;

    if (eventType !== 'call_analyzed') {
      return NextResponse.json({ received: true });
    }

    const call = payload.call || payload.data || payload;
    await handleCallAnalyzed(call);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[personal-secretary webhook] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

async function handleCallAnalyzed(call: any) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (!call?.call_id) return;

  const admin = createAdminClient();
  const ownerId = call?.metadata?.owner_id as string | undefined;

  let owner: Record<string, any> | null = null;
  if (ownerId) {
    const { data } = await admin.from('personal_secretary_owners').select('*').eq('id', ownerId).maybeSingle();
    owner = data;
  }
  if (!owner && call?.to_number) {
    const { data } = await admin
      .from('personal_secretary_owners')
      .select('*')
      .eq('dedicated_phone_number', call.to_number)
      .maybeSingle();
    owner = data;
  }

  if (!owner) {
    console.warn('[personal-secretary webhook] owner not found for call', call.call_id);
    return;
  }

  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis || {};

  await admin.from('personal_secretary_calls').upsert(
    {
      owner_id: owner.id,
      retell_call_id: call.call_id,
      from_number: call.from_number ?? null,
      to_number: call.to_number ?? null,
      caller_name: custom.caller_name ?? null,
      caller_phone: custom.caller_phone ?? null,
      message_reason: custom.message_reason ?? null,
      urgency: custom.urgency ?? null,
      summary: analysis.call_summary ?? analysis.summary ?? null,
      line_notified: false,
    },
    { onConflict: 'retell_call_id' }
  );

  if (!owner.line_user_id) {
    console.warn('[personal-secretary webhook] owner has no line_user_id yet, skip notify. owner_id=', owner.id);
    return;
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN_PERSONAL_SECRETARY;
  if (!token) {
    console.warn('[personal-secretary webhook] LINE token not configured');
    return;
  }

  const message = formatPersonalSecretaryMessage(call, owner, custom);
  await pushLineMessage(token, message, owner.line_user_id);

  await admin.from('personal_secretary_calls').update({ line_notified: true }).eq('retell_call_id', call.call_id);
}

function formatPersonalSecretaryMessage(call: any, owner: Record<string, any>, custom: any): any {
  const callerName = custom.caller_name || '（お名前確認できず）';
  const callerPhone = custom.caller_phone || call.from_number || '（不明）';
  const reason = custom.message_reason || '（用件確認できず）';
  const urgencyLabel: Record<string, string> = { high: '🔴 高', normal: '🟡 通常', low: '🟢 低' };
  const outcomeLabel: Record<string, string> = {
    message_taken: '伝言をお預かりしました',
    no_message: '伝言なし',
    wrong_number: '間違い電話',
    spam: '迷惑電話の可能性',
  };

  const kv = (label: string, value: string) => ({
    type: 'box' as const,
    layout: 'horizontal' as const,
    contents: [
      { type: 'text' as const, text: label, size: 'sm' as const, color: '#888888', flex: 2 },
      { type: 'text' as const, text: value, size: 'sm' as const, flex: 3, align: 'end' as const, wrap: true },
    ],
    margin: 'md' as const,
  });

  const rows: any[] = [kv('👤 お名前', callerName), kv('📱 折り返し先', callerPhone)];
  if (custom.urgency) rows.push(kv('⚡ 緊急度', urgencyLabel[custom.urgency] || custom.urgency));
  if (custom.call_outcome) rows.push(kv('📋 対応', outcomeLabel[custom.call_outcome] || custom.call_outcome));

  return {
    type: 'flex',
    altText: `お電話がありました｜${callerName}様`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: `📞 ${owner.owner_name}様宛にお電話がありました`, size: 'md', weight: 'bold', color: '#FFFFFF', wrap: true }],
        backgroundColor: '#0084FF',
        paddingAll: '15px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📝 ご用件', size: 'sm', color: '#888888' },
          { type: 'text', text: reason, size: 'sm', wrap: true, margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          ...rows,
        ],
      },
      footer: call.recording_url
        ? {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: { type: 'uri', label: '🎧 録音を再生', uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.callcenter-ai.me'}/api/recording/${call.call_id}` },
                style: 'primary',
                color: '#00B900',
              },
            ],
            paddingAll: '10px',
          }
        : undefined,
    },
  };
}
