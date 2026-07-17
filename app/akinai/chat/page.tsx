'use client';

// C1 チャットボット(ロ方式 v0.1)
// マジックリンク → 認証不要で開始 → S3以降を電話と同一分岐・選択肢ボタンUIで実施。
// 発話(表示文言)は lib/akinai/scenario.ts の事前定義のみを使用する。
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UTTERANCES,
  S3_OPTIONS,
  S4_OPTIONS,
  S5_OPTIONS,
  nextNodeAfterS4,
  SCENARIO_VERSION,
  type ScenarioOption,
} from '@/lib/akinai/scenario';

type Msg = { role: 'bot' | 'user'; text: string };
type Stage = 'loading' | 'error' | 'S3' | 'S4' | 'S5' | 'S6' | 'done' | 'escalated';

function ChatInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [stage, setStage] = useState<Stage>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [canResend, setCanResend] = useState(false); // CB2: 失効・使用済み時の再送依頼導線
  const [resendState, setResendState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [branch, setBranch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const addBot = (text: string) => setMsgs((m) => [...m, { role: 'bot', text }]);
  const addUser = (text: string) => setMsgs((m) => [...m, { role: 'user', text }]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, stage]);

  // セッション開始(マジックリンク検証)
  useEffect(() => {
    if (!token) {
      setStage('error');
      setErrorMsg('リンクが正しくありません。SMSに記載のURLからアクセスしてください。');
      return;
    }
    (async () => {
      const res = await fetch('/api/akinai/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        // CB2: 失効・使用済みは契約情報を一切表示せず、再送依頼のみ受け付ける
        const map: Record<number, string> = {
          404: 'リンクが正しくありません。',
          410: 'このリンクは有効期限切れ、または使用済みです。新しいご案内の再送をご希望の場合は、下のボタンからご依頼ください。',
        };
        setStage('error');
        setErrorMsg(map[res.status] || 'エラーが発生しました。時間をおいて再度お試しください。');
        setCanResend(res.status === 410);
        return;
      }
      const j = await res.json();
      addBot(UTTERANCES.C1_INTRO(j.customer_name || ''));
      // CB1: 冒頭に記録保存の旨を表示(定義書v0.2 5章)
      addBot('ご回答いただいた内容は、保険業法に基づく意向把握の記録として保存されます。');
      addBot(UTTERANCES.S3);
      setStage('S3');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const record = useCallback(
    async (node_id: string, selection?: string, utterance_text?: string) => {
      await fetch('/api/akinai/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, node_id, selection, utterance_text }),
      });
    },
    [token]
  );

  const choose = async (node: 'S3' | 'S4' | 'S5', opt: ScenarioOption) => {
    if (busy) return;
    setBusy(true);
    addUser(opt.label);
    await record(node, opt.key);
    if (node === 'S3') {
      setBranch(opt.key);
      addBot(UTTERANCES.S4);
      setStage('S4');
    } else if (node === 'S4') {
      if (opt.key === 'changed') {
        addBot('承知いたしました。詳しいご状況は、ご来店時に担当者が改めてお伺いいたします。');
      }
      const next = nextNodeAfterS4(branch);
      if (next === 'S5') {
        addBot(UTTERANCES.S5);
        setStage('S5');
      } else {
        addBot(UTTERANCES.S6);
        setStage('S6');
      }
    } else if (node === 'S5') {
      addBot(UTTERANCES.S6);
      setStage('S6');
    }
    setBusy(false);
  };

  const submitAppointment = async () => {
    if (busy || !apptDate) return;
    setBusy(true);
    const label = new Date(apptDate).toLocaleString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    addUser(label);
    await record('S6', undefined, label);
    await record('S7');
    addBot(UTTERANCES.S7);
    setStage('done');
    setBusy(false);
  };

  // CB2: 再送依頼(契約情報は一切返さない。担当者へ通知して人が再送する)
  const requestResend = async () => {
    if (resendState !== 'idle') return;
    setResendState('busy');
    await fetch('/api/akinai/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setResendState('done');
  };

  // CB-ESC: 担当者に相談(全画面常設)→折り返しキューへ登録してチャット終了
  const escalateToHuman = async () => {
    if (busy || stage === 'escalated' || stage === 'done') return;
    setBusy(true);
    addUser('担当者に相談したい');
    await record('CB-ESC');
    addBot('かしこまりました。担当者より折り返しご連絡いたしますので、しばらくお待ちください。本日はありがとうございました。');
    setStage('escalated');
    setBusy(false);
  };

  const optionsFor: Record<string, ScenarioOption[]> = { S3: S3_OPTIONS, S4: S4_OPTIONS, S5: S5_OPTIONS };
  const inFlow = stage === 'S3' || stage === 'S4' || stage === 'S5' || stage === 'S6';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 px-3">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <header className="bg-indigo-700 text-white px-5 py-4">
          <h1 className="font-bold">AKINAI 満期更新のご案内</h1>
          <p className="text-xs text-indigo-200">自動車保険 更新意向の確認（シナリオ {SCENARIO_VERSION}）</p>
        </header>

        <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ minHeight: 360 }}>
          {stage === 'error' ? (
            <div className="space-y-3">
              <p className="text-red-600 text-sm">{errorMsg}</p>
              {canResend && (
                <button
                  onClick={requestResend}
                  disabled={resendState !== 'idle'}
                  className="w-full border border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 rounded-xl px-4 py-3 text-sm text-indigo-900"
                >
                  {resendState === 'done' ? '再送依頼を受け付けました。担当者よりご案内します。' : 'ご案内の再送を依頼する'}
                </button>
              )}
            </div>
          ) : (
            msgs.map((m, i) => (
              <div key={i} className={m.role === 'bot' ? 'flex' : 'flex justify-end'}>
                <div
                  className={
                    m.role === 'bot'
                      ? 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-2 text-sm max-w-[85%]'
                      : 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 text-sm max-w-[85%]'
                  }
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {stage === 'loading' && <p className="text-gray-400 text-sm">読み込み中…</p>}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-4 space-y-2">
          {(stage === 'S3' || stage === 'S4' || stage === 'S5') &&
            optionsFor[stage].map((opt) => (
              <button
                key={opt.key}
                disabled={busy}
                onClick={() => choose(stage, opt)}
                className="w-full text-left border border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 rounded-xl px-4 py-3 text-sm text-indigo-900"
              >
                {opt.label}
              </button>
            ))}

          {stage === 'S6' && (
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 text-sm"
              />
              <button
                disabled={busy || !apptDate}
                onClick={submitAppointment}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-semibold"
              >
                この日時で希望する
              </button>
            </div>
          )}

          {stage === 'done' && (
            <p className="text-center text-sm text-gray-600">
              ご回答ありがとうございました。このページは閉じていただけます。
            </p>
          )}

          {stage === 'escalated' && (
            <p className="text-center text-sm text-gray-600">
              担当者より折り返しご連絡いたします。このページは閉じていただけます。
            </p>
          )}

          {/* CB-ESC: 全画面に常設(顧客本位の業務運営原則) */}
          {inFlow && (
            <button
              onClick={escalateToHuman}
              disabled={busy}
              className="w-full text-center text-xs text-gray-500 underline underline-offset-2 pt-1"
            >
              AIではなく担当者に相談する
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-3 max-w-md text-center">
        ご回答内容は保険業法に基づく意向把握の記録として保存されます。比較・推奨のご説明は来店時に担当者が行います。
      </p>
    </div>
  );
}

export default function AkinaiChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中…</div>}>
      <ChatInner />
    </Suspense>
  );
}
