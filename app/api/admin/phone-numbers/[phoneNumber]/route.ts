// /api/admin/phone-numbers/[phoneNumber]
// 個別番号へのエージェント割り当て・削除
import { NextRequest, NextResponse } from 'next/server';
import { Retell } from 'retell-sdk';

export const dynamic = 'force-dynamic';

function getRetellClient() {
  return new Retell({ apiKey: process.env.RETELL_API_KEY! });
}

// PATCH: エージェントIDやニックネームを更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ phoneNumber: string }> }
) {
  try {
    const { phoneNumber } = await params;
    const phone = decodeURIComponent(phoneNumber);
    const body = await req.json();
    const { inbound_agent_id, outbound_agent_id, nickname } = body;

    const retellClient = getRetellClient();
    const updated = await retellClient.phoneNumber.update(phone, {
      inbound_agent_id: inbound_agent_id ?? undefined,
      outbound_agent_id: outbound_agent_id ?? undefined,
      nickname: nickname ?? undefined,
    });

    return NextResponse.json({
      success: true,
      phone_number: (updated as any).phone_number,
      inbound_agent_id: (updated as any).inbound_agent_id,
      nickname: (updated as any).nickname,
    });
  } catch (error: any) {
    console.error('phone-numbers PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Retell AI から番号の登録を解除
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ phoneNumber: string }> }
) {
  try {
    const { phoneNumber } = await params;
    const phone = decodeURIComponent(phoneNumber);
    const retellClient = getRetellClient();
    await (retellClient.phoneNumber as any).delete(phone);
    return NextResponse.json({ success: true, message: `${phone} の登録を解除しました` });
  } catch (error: any) {
    console.error('phone-numbers DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
