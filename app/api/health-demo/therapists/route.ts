import { NextRequest, NextResponse } from 'next/server'
import { getAvailableTherapists, getTherapistById, COURSES, OPTIONS } from '@/lib/health-demo/therapists'

export const dynamic = 'force-dynamic'

// Retell functionから呼ばれる：空き確認・詳細照会
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const therapistId = searchParams.get('id')

  if (therapistId) {
    const therapist = getTherapistById(therapistId)
    if (!therapist) {
      return NextResponse.json({ error: 'セラピストが見つかりません' }, { status: 404 })
    }
    return NextResponse.json({
      therapist,
      courses: COURSES,
      options: OPTIONS,
    })
  }

  const available = getAvailableTherapists()
  const hour = new Date().getHours()

  return NextResponse.json({
    available_count: available.length,
    current_hour: hour,
    therapists: available.map(t => ({
      id: t.id,
      name: t.name,
      age: t.age,
      height: t.height,
      specialties: t.specialties.slice(0, 2),
      summary: t.personality.slice(0, 40) + '...',
    })),
    courses: COURSES,
    options: OPTIONS,
  })
}
