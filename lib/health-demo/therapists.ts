export interface Therapist {
  id: string
  name: string
  age: number
  height: string
  bodyType: string
  experienceYears: number
  specialties: string[]
  personality: string
  description: string
  availableHours: number[] // 0-23
}

export interface Course {
  id: string
  name: string
  minutes: number
  price: number
}

export interface Option {
  id: string
  name: string
  price: number
  description: string
}

export const THERAPISTS: Therapist[] = [
  {
    id: 'sakura',
    name: 'さくら',
    age: 22,
    height: '158cm',
    bodyType: 'スレンダー',
    experienceYears: 3,
    specialties: ['リラクゼーション', 'アロマトリートメント', '肩こり解消'],
    personality: '明るくて話しやすい、丁寧な接客が好評です。初めての方でもリラックスして受けていただけます。',
    description: '清楚で笑顔が素敵な女性です。細やかな気配りと丁寧な施術で、リピーターの多い人気セラピストです。',
    availableHours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    id: 'miku',
    name: 'みく',
    age: 25,
    height: '162cm',
    bodyType: 'グラマー',
    experienceYears: 5,
    specialties: ['ディープティッシュ', 'スポーツマッサージ', 'ストレッチ'],
    personality: '落ち着いた大人の雰囲気で、プロフェッショナルな対応が特徴。しっかりほぐしてほしい方に特におすすめです。',
    description: '大人っぽい癒し系の女性です。5年のキャリアを持つベテランで、凝り固まった筋肉をしっかりほぐす技術に定評があります。',
    availableHours: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
  },
  {
    id: 'aoi',
    name: 'あおい',
    age: 20,
    height: '155cm',
    bodyType: 'スレンダー',
    experienceYears: 1,
    specialties: ['スウェーデン式マッサージ', 'ヘッドスパ', 'フットリフレクソロジー'],
    personality: '元気で明るい性格。一生懸命丁寧に施術します。フットリフレが特に得意で好評です。',
    description: '可愛らしい雰囲気の元気な女性です。若くてフレッシュ、全力で施術してくれる頑張り屋さんです。',
    availableHours: [15, 16, 17, 18, 19, 20, 21, 22, 23],
  },
  {
    id: 'yui',
    name: 'ゆい',
    age: 27,
    height: '160cm',
    bodyType: 'ふくよか',
    experienceYears: 7,
    specialties: ['タイ古式マッサージ', 'ホットストーン', 'リンパドレナージュ'],
    personality: '包み込むような温かい雰囲気。ベテランならではの安心感があります。体が硬い方にも丁寧に対応します。',
    description: '母性的な温かみのある女性です。7年のキャリアを持つエース級のセラピスト。特にタイ古式は本場仕込みの本格派です。',
    availableHours: [10, 11, 12, 13, 17, 18, 19, 20, 21],
  },
]

export const COURSES: Course[] = [
  { id: '60min', name: '60分コース', minutes: 60, price: 8000 },
  { id: '90min', name: '90分コース', minutes: 90, price: 12000 },
  { id: '120min', name: '120分コース', minutes: 120, price: 15000 },
  { id: '150min', name: '150分コース', minutes: 150, price: 18000 },
]

export const OPTIONS: Option[] = [
  { id: 'aroma', name: 'アロマオイル', price: 1000, description: '厳選アロマオイル使用。香りで深いリラクゼーション効果' },
  { id: 'headspa', name: 'ヘッドスパ', price: 1500, description: '頭皮マッサージ。頭痛・眼精疲労に効果的' },
  { id: 'hotstone', name: 'ホットストーン', price: 2000, description: '温かい石で筋肉を芯から温める深部マッサージ' },
  { id: 'stretch', name: 'ストレッチ', price: 1000, description: '施術後にストレッチで体をほぐします' },
]

// 現在時刻で空いているセラピストを取得
export function getAvailableTherapists(): Therapist[] {
  const hour = new Date().getHours()
  return THERAPISTS.filter(t => t.availableHours.includes(hour))
}

export function getTherapistById(id: string): Therapist | undefined {
  return THERAPISTS.find(t => t.id === id || t.name === id)
}
