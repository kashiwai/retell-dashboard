export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">テストページ</h1>
      <p>このページが表示されれば、基本的な動作は正常です。</p>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>環境情報:</p>
        <ul className="list-disc list-inside">
          <li>Node環境: {typeof window === 'undefined' ? 'サーバー' : 'クライアント'}</li>
          <li>ビルド時刻: {new Date().toLocaleString('ja-JP')}</li>
        </ul>
      </div>
      <div className="mt-4">
        <a href="/login" className="text-blue-600 hover:underline">ログインページへ →</a>
      </div>
    </div>
  );
}