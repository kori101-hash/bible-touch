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
