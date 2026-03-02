// 料金計算設定
// 基本料金 + Retell AI原価の20%マージン

export interface PricingConfig {
  // 基本料金（月額）
  baseFee: number;
  
  // Retell AI原価
  retellCosts: {
    perMinute: number;  // 通話1分あたりのコスト（USD）
    agentFee: number;   // エージェント月額費用（もしあれば）
  };
  
  // Twilio原価（電話番号関連）
  twilioCosts: {
    phoneNumberMonthly: number;  // 電話番号月額（USD）
    inboundPerMinute: number;    // 着信1分あたり（USD）
  };
  
  // マージン設定
  marginPercentage: number;  // デフォルト20%
  
  // 通貨レート
  usdToJpy: number;  // USD→JPY変換レート
}

// デフォルトの料金設定
export const DEFAULT_PRICING: PricingConfig = {
  baseFee: 5000,  // 5,000円/月
  
  retellCosts: {
    perMinute: 0.10,  // $0.10/分（Retell AI公式料金）
    agentFee: 0,      // Pay as you goプランの場合は0
  },
  
  twilioCosts: {
    phoneNumberMonthly: 1.50,  // $1.50/月
    inboundPerMinute: 0.0085,  // $0.0085/分
  },
  
  marginPercentage: 0.20,  // 20%マージン
  
  usdToJpy: 150,  // 1USD = 150円（定期的に更新）
};

// 環境変数から料金設定を取得
export function getPricingConfig(): PricingConfig {
  return {
    baseFee: Number(process.env.PRICING_BASE_FEE) || DEFAULT_PRICING.baseFee,
    
    retellCosts: {
      perMinute: Number(process.env.RETELL_COST_PER_MINUTE) || DEFAULT_PRICING.retellCosts.perMinute,
      agentFee: Number(process.env.RETELL_AGENT_FEE) || DEFAULT_PRICING.retellCosts.agentFee,
    },
    
    twilioCosts: {
      phoneNumberMonthly: Number(process.env.TWILIO_PHONE_MONTHLY) || DEFAULT_PRICING.twilioCosts.phoneNumberMonthly,
      inboundPerMinute: Number(process.env.TWILIO_INBOUND_PER_MINUTE) || DEFAULT_PRICING.twilioCosts.inboundPerMinute,
    },
    
    marginPercentage: Number(process.env.PRICING_MARGIN) || DEFAULT_PRICING.marginPercentage,
    
    usdToJpy: Number(process.env.USD_TO_JPY) || DEFAULT_PRICING.usdToJpy,
  };
}

// 通話料金計算（1分あたり）
export function calculateCallCostPerMinute(): {
  cost: number;      // 原価
  price: number;     // 販売価格（マージン込み）
  breakdown: {
    retell: number;
    twilio: number;
    margin: number;
  };
} {
  const config = getPricingConfig();
  
  // 原価計算（USD）
  const retellCostUSD = config.retellCosts.perMinute;
  const twilioCostUSD = config.twilioCosts.inboundPerMinute;
  const totalCostUSD = retellCostUSD + twilioCostUSD;
  
  // 日本円に変換
  const totalCostJPY = totalCostUSD * config.usdToJpy;
  
  // マージンを追加
  const marginAmount = totalCostJPY * config.marginPercentage;
  const sellingPrice = totalCostJPY + marginAmount;
  
  // 10円単位に切り上げ
  const roundedPrice = Math.ceil(sellingPrice / 10) * 10;
  
  return {
    cost: Math.round(totalCostJPY),
    price: roundedPrice,
    breakdown: {
      retell: Math.round(retellCostUSD * config.usdToJpy),
      twilio: Math.round(twilioCostUSD * config.usdToJpy),
      margin: Math.round(marginAmount),
    },
  };
}

// 月額料金計算（お客様ごと）
export function calculateMonthlyFee(totalMinutes: number): {
  baseFee: number;
  callCharges: number;
  total: number;
  breakdown: {
    retellCost: number;
    twilioCost: number;
    phoneNumberCost: number;
    margin: number;
  };
} {
  const config = getPricingConfig();
  const perMinuteRate = calculateCallCostPerMinute();
  
  // 通話料金
  const callCharges = perMinuteRate.price * totalMinutes;
  
  // 電話番号の月額コスト（日本円）
  const phoneNumberCostJPY = config.twilioCosts.phoneNumberMonthly * config.usdToJpy;
  
  // 原価の内訳
  const retellCost = config.retellCosts.perMinute * totalMinutes * config.usdToJpy;
  const twilioCost = (config.twilioCosts.inboundPerMinute * totalMinutes + 
                      config.twilioCosts.phoneNumberMonthly) * config.usdToJpy;
  
  // マージン計算
  const totalCost = retellCost + twilioCost;
  const margin = totalCost * config.marginPercentage;
  
  return {
    baseFee: config.baseFee,
    callCharges: Math.round(callCharges),
    total: Math.round(config.baseFee + callCharges),
    breakdown: {
      retellCost: Math.round(retellCost),
      twilioCost: Math.round(twilioCost),
      phoneNumberCost: Math.round(phoneNumberCostJPY),
      margin: Math.round(margin),
    },
  };
}

// 利益率計算
export function calculateProfitMargin(revenue: number, cost: number): {
  profit: number;
  marginPercentage: number;
  marginAmount: number;
} {
  const profit = revenue - cost;
  const marginPercentage = (profit / revenue) * 100;
  
  return {
    profit: Math.round(profit),
    marginPercentage: Math.round(marginPercentage * 10) / 10,  // 小数点1位まで
    marginAmount: Math.round(profit),
  };
}

// 料金プラン提案（お客様向け）
export function generatePricingPlans(): {
  basic: PricingPlan;
  standard: PricingPlan;
  premium: PricingPlan;
} {
  const perMinuteRate = calculateCallCostPerMinute();
  
  return {
    basic: {
      name: 'ベーシックプラン',
      monthlyFee: 5000,
      includedMinutes: 0,
      perMinuteRate: perMinuteRate.price,
      features: [
        'AI受付対応',
        'メール通知',
        '通話履歴30日保存',
      ],
    },
    standard: {
      name: 'スタンダードプラン',
      monthlyFee: 10000,
      includedMinutes: 60,  // 60分込み
      perMinuteRate: Math.round(perMinuteRate.price * 0.9),  // 10%割引
      features: [
        'AI受付対応',
        'メール通知',
        'LINE通知',
        '通話履歴90日保存',
        'GPT要約機能',
      ],
    },
    premium: {
      name: 'プレミアムプラン',
      monthlyFee: 20000,
      includedMinutes: 200,  // 200分込み
      perMinuteRate: Math.round(perMinuteRate.price * 0.8),  // 20%割引
      features: [
        'AI受付対応',
        'メール通知',
        'LINE通知',
        'Slack連携',
        '通話履歴無制限保存',
        'GPT要約機能',
        '音声録音',
        '分析レポート',
      ],
    },
  };
}

interface PricingPlan {
  name: string;
  monthlyFee: number;
  includedMinutes: number;
  perMinuteRate: number;
  features: string[];
}