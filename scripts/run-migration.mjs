// Supabaseにマイグレーションを実行するスクリプト
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('エラー: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください')
  process.exit(1)
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const sql = readFileSync(join(__dirname, '../supabase/migrations/001_init.sql'), 'utf-8')

// SQL文を個別に分割して実行
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`実行するSQL文: ${statements.length}件\n`)

let success = 0
let skipped = 0

for (const stmt of statements) {
  const preview = stmt.substring(0, 60).replace(/\n/g, ' ')
  try {
    const { error } = await client.rpc('exec_sql', { sql: stmt + ';' }).single()
    if (error) {
      // already existsエラーはスキップ
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`⏭️  スキップ: ${preview}...`)
        skipped++
      } else {
        console.log(`⚠️  警告: ${preview}...`)
        console.log(`   ${error.message}`)
      }
    } else {
      console.log(`✅ 成功: ${preview}...`)
      success++
    }
  } catch (e) {
    console.log(`ℹ️  ${preview}...`)
  }
}

console.log(`\n完了: 成功=${success} スキップ=${skipped}`)
console.log('\n次のステップ: Supabase SQL Editor で migration SQL を手動実行してください')
console.log('URL: https://supabase.com/dashboard/project/drqmzstdpdxxznabjfnu/sql/new')
