'use client';

// 予約確認ページ: 確認SMSのURLから開く(閲覧専用・7日有効)
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Booking = { customer_name: string | null; appointment_at: string | null; changed: boolean };

function BookingInner() {
  const params = useSearchParams();
  const token = params.get('t') || '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('リンクが正しくありません。SMSに記載のURLからアクセスしてください。');
      return;
    }
    (async () => {
      const res = await fetch('/api/akinai/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setState('error');
        setErrorMsg(
          res.status === 410
            ? 'このリンクは有効期限切れです。ご予約内容の確認は 050-1725-0049 までお電話ください。'
            : 'ご予約情報が見つかりませんでした。お手数ですが 050-1725-0049 までお電話ください。'
        );
        return;
      }
      setBooking(await res.json());
      setState('ok');
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        <header className="bg-indigo-700 text-white px-5 py-4">
          <h1 className="font-bold">ご来店予約の確認</h1>
          <p className="text-xs text-indigo-200">AKINAI／Data Agent AI株式会社</p>
        </header>
        <div className="p-5 space-y-4">
          {state === 'loading' && <p className="text-gray-400 text-sm">読み込み中…</p>}
          {state === 'error' && <p className="text-red-600 text-sm">{errorMsg}</p>}
          {state === 'ok' && booking && (
            <>
              <p className="text-sm text-gray-700">
                {booking.customer_name ? `${booking.customer_name}様、` : ''}お電話ありがとうございました。
                {booking.changed ? 'ご予約の変更を承りました。' : 'ご来店のご予約を承りました。'}
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <p className="text-xs text-indigo-500 mb-1">ご予約日時</p>
                <p className="text-lg font-bold text-indigo-900">{booking.appointment_at || '（確認中）'}</p>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>■ ご来店時は保険証券（または更新のご案内）をお持ちください。</p>
                <p>
                  ■ 変更・キャンセルの際は{' '}
                  <a href="tel:05017250049" className="text-indigo-600 underline">
                    050-1725-0049
                  </a>{' '}
                  までお電話ください。
                </p>
              </div>
              <p className="text-xs text-gray-400">当日お会いできることを楽しみにしております。</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中…</div>}>
      <BookingInner />
    </Suspense>
  );
}
