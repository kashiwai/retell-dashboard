import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// 録音の再生ページを返す。
// 音声バイトをサーバー経由で中継せず(サイズ上限回避)、
// Retellから取得した recording_url を <audio> で直接再生する。
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { callId } = await params;

  if (!process.env.RETELL_API_KEY) {
    return NextResponse.json({ error: 'Retell API key not configured' }, { status: 500 });
  }

  try {
    const retellClient = new Retell({ apiKey: process.env.RETELL_API_KEY });
    const call = await retellClient.call.retrieve(callId);

    if (!call.recording_url) {
      return new NextResponse(
        htmlPage('録音がまだ準備できていません', '<p>この通話の録音はまだ利用できません。数分後に再度お試しください。</p>'),
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // ?raw=1 の場合は録音URLへ302リダイレクト(直接ダウンロード用)
    if (request.nextUrl.searchParams.get('raw') === '1') {
      return NextResponse.redirect(call.recording_url);
    }

    const startedAt = call.start_timestamp
      ? new Date(call.start_timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
      : '';
    const body = `
      <p class="meta">通話ID: ${escapeHtml(callId)}${startedAt ? ` ／ ${escapeHtml(startedAt)}` : ''}</p>
      <audio controls autoplay preload="auto" src="${escapeHtml(call.recording_url)}" style="width:100%;max-width:520px"></audio>
      <p><a href="${escapeHtml(call.recording_url)}" download>録音ファイルをダウンロード (.wav)</a></p>
    `;
    return new NextResponse(htmlPage('通話録音', body), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error: any) {
    console.error('Recording error:', error);
    return new NextResponse(
      htmlPage('録音の取得に失敗しました', `<p>${escapeHtml(error?.message || 'unknown error')}</p>`),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

function htmlPage(title: string, inner: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;margin:0;padding:24px;background:#0b1220;color:#e8eefc}
.card{max-width:560px;margin:0 auto;background:#131c31;border-radius:12px;padding:20px}
h1{font-size:18px;margin:0 0 12px}.meta{color:#93a4c8;font-size:13px}a{color:#7cc0ff}</style></head>
<body><div class="card"><h1>🎧 ${escapeHtml(title)}</h1>${inner}</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
