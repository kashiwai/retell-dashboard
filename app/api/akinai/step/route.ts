import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logEvidence, upsertSession, getSession, finalizeSession, sendPostConfirmMail } from '@/lib/akinai/store';
import { S3_OPTIONS, S4_OPTIONS, S5_OPTIONS } from '@/lib/akinai/scenario';

export const dynamic = 'force-dynamic';

// C1 チャットボット: 分岐選択の記録(S3以降、電話と同一分岐)。
// 全選択をタイムスタンプ付きで append-only 証跡に保存する。
const NODE_OPTIONS: Record<string, { key: string; label: string }[]> = {
  S3: S3_OPTIONS,
  S4: S4_OPTIONS,
  S5: S5_OPTIONS,
};

export async function POST(request: NextRequest) {
  let body: { token?: string; node_id?: string; selection?: string; utterance_text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { token, node_id, selection, utterance_text } = body;
  if (!token || !node_id) return NextResponse.json({ error: 'token and node_id required' }, { status: 400 });

  // トークン検証(セッション認証を兼ねる)
  const sb = createAdminClient();
  const { data: link } = await sb.from('akinai_magic_links').select('*').eq('token', token).maybeSingle();
  if (!link || !link.used_at) return NextResponse.json({ error: 'invalid_link' }, { status: 403 });

  const chatCallId = `chat_${link.call_id}`;
  const session = await getSession(chatCallId);
  if (!session || session.ended_at) return NextResponse.json({ error: 'session_closed' }, { status: 410 });

  // ノード別の選択肢バリデーション(事前定義外の値は拒否)
  const options = NODE_OPTIONS[node_id];
  if (options && !options.some((o) => o.key === selection)) {
    return NextResponse.json({ error: 'invalid_selection' }, { status: 400 });
  }

  const selectedLabel = options?.find((o) => o.key === selection)?.label ?? null;
  const seq = await logEvidence({
    call_id: chatCallId,
    customer_id: link.customer_id,
    channel: 'chat',
    node_id,
    presented_options: options?.map((o) => o.key) ?? null,
    branch_selected: selection ?? null,
    utterance_text: utterance_text ?? selectedLabel,
  });

  // セッション集約フィールドの更新
  if (node_id === 'S3') await upsertSession(chatCallId, { branch_selected: selection });
  if (node_id === 'S4') await upsertSession(chatCallId, { life_change_flag: selection === 'changed' });
  if (node_id === 'S5')
    await upsertSession(chatCallId, {
      option_selected: selection === 'skip' ? null : selectedLabel,
      option_skipped: selection === 'skip',
    });
  if (node_id === 'S6') await upsertSession(chatCallId, { appointment_at: utterance_text ?? null });

  // S7: 証跡確定(ハッシュ・TSA) + 後確メール(R1/R2)
  let finalized = null;
  let postConfirm = null;
  if (node_id === 'S7') {
    finalized = await finalizeSession(chatCallId);
    postConfirm = await sendPostConfirmMail(chatCallId);
  }

  return NextResponse.json({ ok: true, append_only_seq: seq, finalized, post_confirm: postConfirm });
}
