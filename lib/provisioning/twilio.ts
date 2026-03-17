import twilio from 'twilio'

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  )
}

export interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
}

/** 利用可能な050番号を検索 */
export async function searchAvailable050Numbers(limit = 5): Promise<AvailableNumber[]> {
  const client = getClient()
  const numbers = await client
    .availablePhoneNumbers('JP')
    .local.list({ limit, contains: '050*' })

  return numbers.map(n => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
  }))
}

/** 050番号を購入 */
export async function purchasePhoneNumber(phoneNumber: string): Promise<{ sid: string; phoneNumber: string }> {
  const client = getClient()
  const purchased = await client.incomingPhoneNumbers.create({ phoneNumber })
  return { sid: purchased.sid, phoneNumber: purchased.phoneNumber }
}

/** Elastic SIP Trunk を作成 */
export async function createElasticSipTrunk(friendlyName: string): Promise<{ sid: string }> {
  const client = getClient()
  const trunk = await client.trunking.v1.trunks.create({ friendlyName })
  return { sid: trunk.sid }
}

/** Origination URI を設定（Retell AI LiveKit） */
export async function addOriginationUri(trunkSid: string, sipUri: string): Promise<void> {
  const client = getClient()
  await client.trunking.v1.trunks(trunkSid).originationUrls.create({
    friendlyName: 'Retell AI LiveKit',
    sipUrl: sipUri,
    priority: 10,
    weight: 100,
    enabled: true,
  })
}

/** 電話番号をSIP Trunkに紐付け */
export async function assignNumberToTrunk(trunkSid: string, phoneNumberSid: string): Promise<void> {
  const client = getClient()
  await client.trunking.v1.trunks(trunkSid).phoneNumbers.create({
    phoneNumberSid,
  })
}

/** 電話番号を解放（ロールバック用） */
export async function releasePhoneNumber(phoneNumberSid: string): Promise<void> {
  const client = getClient()
  await client.incomingPhoneNumbers(phoneNumberSid).remove()
}

/** SIP Trunkを削除（ロールバック用） */
export async function deleteTrunk(trunkSid: string): Promise<void> {
  const client = getClient()
  await client.trunking.v1.trunks(trunkSid).remove()
}

/** Termination URI を取得 */
export function getTrunkTerminationUri(trunkSid: string): string {
  // Twilio Elastic SIP Trunk のTermination URI形式
  return `${trunkSid}.pstn.twilio.com`
}
