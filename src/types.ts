export interface Recommendation {
  source: string; // 분류 (성경 말씀, 불교 경전, 인문학 및 동서양 철학, 위로의 명언 및 에세이)
  citation: string; // 출처
  quote: string; // 실제 구절
  meaning: string; // 현대적 의미 해설
  application: string; // 사용자 고민 대입 조언
}

export interface WorryResult {
  worryAnalysis: string; // 고민 분석 및 공감
  recommendations: Recommendation[]; // 추천 말씀 리스트
  comfortingMessage: string; // 마지막 위로 편지
  recommendedActions: string[]; // 마음 챙김 행동 리스트
}

export interface HistoryItem {
  id: string; // 고유 ID
  timestamp: string; // 작성 일시 (포맷팅된 형태)
  worry: string; // 작성한 고민
  tone: string; // 어조
  sources: string[]; // 선택된 소스 분류
  result: WorryResult; // 받아온 추천 결과
}

// TradingView 자동매매 관련 타입
export interface TradingViewSignal {
  symbol: string; // 거래 쌍 (BTC, ETH, XRP 등)
  side: "buy" | "sell"; // 매수/매도
  price?: number; // 신호 생성 시 가격
  timestamp: string; // 신호 생성 시간
}

export interface TradeConfig {
  enabled: boolean; // 자동매매 활성화
  exchange: "upbit"; // 거래소
  apiKey: string; // API 키
  apiSecret: string; // API 시크릿
  coins: string[]; // 거래할 코인 목록 (BTC, ETH, XRP 등)
  positionSizePercent: number; // 포지션 크기 (계정 잔액의 %)
  stopLossPercent: number; // 손절매 비율 (%)
  takeProfitPercent: number; // 익절매 비율 (%)
  maxDailyLoss: number; // 일일 최대 손실액 (KRW)
}

export interface ActiveTrade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  entryPrice: number;
  quantity: number;
  totalKRW: number;
  stopLoss: number;
  takeProfit: number;
  openTime: string;
  status: "open" | "closed";
  closePrice?: number;
  closeTime?: string;
  pnl?: number; // 손익
}

export interface TradeHistory {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  totalKRW: number;
  pnl: number;
  pnlPercent: number;
  openTime: string;
  closeTime: string;
  reason: "stop_loss" | "take_profit" | "manual";
}
