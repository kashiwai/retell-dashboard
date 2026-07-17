// AKINAI CallCenter ロ方式シナリオ定義 v0.2
// 出典: AKINAI_CallCenter_ロ方式シナリオ定義書_v0.2.md
// 原則: 発話は事前定義済みのみ。生成AIによる自由発話を用いない。
// 入口は3つ(OB/IB/CB)、意向把握コア(S3〜S7)は1つ(定義書 原則5)。
// 事故のご連絡はAIが扱わない。即時に人へ引き継ぐ(原則7)。

export const SCENARIO_VERSION = 'v0.2';

export type EntryPoint = 'OB' | 'IB' | 'CB';

export interface ScenarioOption {
  key: string;
  label: string;
}

// S3 意向確認【3択・意向把握義務(施行規則234条の2)】
export const S3_OPTIONS: ScenarioOption[] = [
  { key: 'A', label: '同一条件で更新' },
  { key: 'B', label: '他社等の商品と比較して検討' },
  { key: 'C', label: '補償内容を変更して更新' },
];

// S4 生活変化ヒアリング【2択・変更事項確認義務】
export const S4_OPTIONS: ScenarioOption[] = [
  { key: 'no_change', label: '特にありません' },
  { key: 'changed', label: '変化があります' },
];

// S5 追加オプション【任意・S3=Aの場合のみ。スキップ可能を必ず明示】
export const S5_OPTIONS: ScenarioOption[] = [
  { key: 'safety', label: '安全機能に関する追加オプション' },
  { key: 'review', label: '補償内容の見直し相談' },
  { key: 'compare', label: '他社保険との比較確認' },
  { key: 'skip', label: '不要（スキップ）' },
];

// IB4 用件分岐【4択・インバウンド】③事故は即時・最優先で人へ
export const IB4_OPTIONS: ScenarioOption[] = [
  { key: 'renewal', label: '更新のご相談' },
  { key: 'appointment', label: '来店予約の変更・確認' },
  { key: 'accident', label: '事故のご連絡' },
  { key: 'other', label: 'その他' },
];

// 事前定義発話(チャット表示・電話読み上げ共通の原文)
export const UTTERANCES = {
  S1: (name: string) => `${name ? name + '様' : 'ご契約者ご本人様'}のお電話でお間違いないでしょうか。`,
  S2: (expiry: string) =>
    `品質確認のため通話を録音しております。本日は、${expiry || '満期'}に満期を迎えるご契約の更新についてご案内です。`,
  S3: '今回の更新の進め方について、ご希望をお聞かせください。「同一条件で更新」「他社等の商品と比較して検討」「補償内容を変更して更新」の3つからお選びいただけます。',
  S4: '前回のご契約から、お車の使い方やご家族の状況に変化はございましたか。',
  S5: 'ご不要でしたら飛ばしていただけます。来店時のご参考として、いくつかご案内できるものがございます。ご関心がない場合はスキップいただけます。',
  S6: 'ご来店のご希望日時をお聞かせください。',
  S7: '本日はお時間をいただきありがとうございました。確認のメールをお送りいたしますので、内容にお間違いがないかご確認ください。',
  C1_INTRO: (name: string) =>
    `${name ? name + '様、' : ''}自動車保険の満期更新のご案内です。いくつかの質問にお答えいただくだけで、ご来店の準備が整います。`,
} as const;

export type NodeId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'F1' | 'C1' | 'E1' | 'R1' | 'R2';

// S4の回答は深掘りしない(定義書S4備考)。S5はA選択時のみ(定義書S5実施条件)。
export function nextNodeAfterS4(branchSelected: string | null): NodeId {
  return branchSelected === 'A' ? 'S5' : 'S6';
}

// 後確ルーティング(定義書4章): A→R1確認メール / B・C→R2面談ご案内メール
export function postConfirmType(branchSelected: string | null): 'R1' | 'R2' {
  return branchSelected === 'A' ? 'R1' : 'R2';
}
