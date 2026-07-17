'use client';

// 配信停止(オプトアウト)ページ【特定電子メール法対応】
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function OptOutInner() {
  const params = useSearchParams();
  const token = params.get('t') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const submit = async () => {
    setState('busy');
    const res = await fetch('/api/akinai/optout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    setState(res.ok ? 'done' : 'error');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 text-center space-y-4">
        <h1 className="font-bold text-gray-900">SMS配信停止のお手続き</h1>
        {state === 'done' ? (
          <p className="text-sm text-gray-600">
            配信停止を承りました。今後、AKINAIからのご案内SMSはお送りいたしません。
          </p>
        ) : state === 'error' ? (
          <p className="text-sm text-red-600">
            お手続きできませんでした。SMSに記載のリンクから再度アクセスいただくか、お電話にてご連絡ください。
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              AKINAI（Data Agent AI株式会社）からの満期更新ご案内SMSの配信を停止します。よろしいですか？
            </p>
            <button
              onClick={submit}
              disabled={state === 'busy' || !token}
              className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-semibold"
            >
              配信を停止する
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OptOutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中…</div>}>
      <OptOutInner />
    </Suspense>
  );
}
