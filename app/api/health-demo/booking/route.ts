import { NextRequest, NextResponse } from 'next/server'
import { getTherapistById, COURSES, OPTIONS } from '@/lib/health-demo/therapists'

export const dynamic = 'force-dynamic'

export interface HealthBooking {
  therapist_id: string
  course_id: string
  option_ids: string[]
  customer_name: string
  customer_phone: string
  address: string
  scheduled_time: string // ISO or "今から" or "HH:MM"
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: HealthBooking = await request.json()
    const { therapist_id, course_id, option_ids = [], customer_name, customer_phone, address, scheduled_time, notes } = body

    const therapist = getTherapistById(therapist_id)
    const course = COURSES.find(c => c.id === course_id)
    if (!therapist || !course) {
      return NextResponse.json({ error: '無効なセラピストまたはコースです' }, { status: 400 })
    }

    const selectedOptions = OPTIONS.filter(o => option_ids.includes(o.id))
    const optionTotal = selectedOptions.reduce((sum, o) => sum + o.price, 0)
    const totalPrice = course.price + optionTotal

    const bookingId = `HB${Date.now()}`

    // LINE通知
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      const lineMsg = buildLineMessage({
        bookingId, therapist, course, selectedOptions,
        totalPrice, customer_name, customer_phone,
        address, scheduled_time, notes,
      })
      await sendLineNotification(lineMsg)
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      summary: {
        therapist: therapist.name,
        course: course.name,
        options: selectedOptions.map(o => o.name),
        total_price: totalPrice,
        customer_name,
        address,
        scheduled_time,
        message: `予約が確定しました！${therapist.name}が${scheduled_time}にお伺いします。合計金額は¥${totalPrice.toLocaleString()}です。`,
      }
    })
  } catch (error: any) {
    console.error('Health booking error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function buildLineMessage(data: {
  bookingId: string
  therapist: ReturnType<typeof getTherapistById>
  course: typeof COURSES[0]
  selectedOptions: typeof OPTIONS
  totalPrice: number
  customer_name: string
  customer_phone: string
  address: string
  scheduled_time: string
  notes?: string
}) {
  const optText = data.selectedOptions.length > 0
    ? `\nオプション: ${data.selectedOptions.map(o => `${o.name}(¥${o.price.toLocaleString()})`).join(', ')}`
    : ''

  return `📋 【出張マッサージ予約】\n予約ID: ${data.bookingId}\n\n👤 担当: ${data.therapist!.name}（${data.therapist!.age}歳）\n💆 コース: ${data.course.name} ¥${data.course.price.toLocaleString()}${optText}\n💰 合計: ¥${data.totalPrice.toLocaleString()}\n\n🕐 時間: ${data.scheduled_time}\n📍 場所: ${data.address}\n\n👥 お客様: ${data.customer_name} 様\n📞 連絡先: ${data.customer_phone}${data.notes ? `\n📝 備考: ${data.notes}` : ''}`
}

async function sendLineNotification(message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const userId = process.env.LINE_NOTIFY_USER_ID || process.env.LINE_USER_ID

  if (!token || !userId) return

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }],
    }),
  })
}
