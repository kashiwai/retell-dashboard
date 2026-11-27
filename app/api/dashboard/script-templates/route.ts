import { NextResponse } from 'next/server';
import { SCRIPT_TEMPLATES } from '@/config/script-templates';

export const dynamic = 'force-dynamic';

// 台本テンプレートの一覧を返す(台本編集画面のテンプレート選択用)
export async function GET() {
  return NextResponse.json({
    templates: SCRIPT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      prompt: t.prompt,
    })),
  });
}
