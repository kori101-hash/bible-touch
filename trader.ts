import { UpbitClient } from "./upbit-client";
import { v4 as uuidv4 } from "uuid";
import type { TradeConfig, ActiveTrade, TradeHistory, TradingViewSignal } from "./src/types";

export class AutoTrader {
  private upbit: UpbitClient;
  private config: TradeConfig;
  private activeTrades: Map<string, ActiveTrade> = new Map();
  private tradeHistory: TradeHistory[] = [];
  private dailyLoss: number = 0;
  private dayStart: Date = new Date();

  constructor(config: TradeConfig) {
    this.config = config;
    this.upbit = new UpbitClient({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
    });
  }

  /**
   * TradingView 신호 처리
   */
  async processSignal(signal: TradingViewSignal): Promise<void> {
    if (!this.config.enabled) {
      console.log("자동매매가 비활성화되어 있습니다.");
      return;
    }

    // 일일 손실 한도 체크
    if (this.dailyLoss >= this.config.maxDailyLoss) {
      console.log("일일 최대 손실액에 도달했습니다. 거래를 중단합니다.");
      return;
    }

    try {
      if (signal.side === "buy") {
        await this.handleBuySignal(signal);
      } else {
        await this.handleSellSignal(signal);
      }
    } catch (error) {
      console.error(`신호 처리 중 오류: ${error}`);
    }
  }

  /**
   * 매수 신호 처리
   */
  private async handleBuySignal(signal: TradingViewSignal): Promise<void> {
    const market = `KRW-${signal.symbol}`;

    // 현재 KRW 잔액 조회
    const balance = await this.upbit.getKRWBalance();

    // 포지션 크기 계산
    const positionSize = balance * (this.config.positionSizePercent / 100);

    if (positionSize < 5000) {
      console.log("최소 거래액(5,000 KRW)보다 작습니다.");
      return;
    }

    try {
      // 현재 가격 조회
      const ticker = await this.upbit.getTicker(market);
      const currentPrice = ticker.trade_price;

      // 시장가 매수
      const order = await this.upbit.buyMarket(market, positionSize);

      // 거래 기록 생성
      const trade: ActiveTrade = {
        id: uuidv4(),
        symbol: signal.symbol,
        side: "buy",
        entryPrice: currentPrice,
        quantity: positionSize / currentPrice,
        totalKRW: positionSize,
        stopLoss: currentPrice * (1 - this.config.stopLossPercent / 100),
        takeProfit: currentPrice * (1 + this.config.takeProfitPercent / 100),
        openTime: new Date().toISOString(),
        status: "open",
      };

      this.activeTrades.set(trade.id, trade);
      console.log(`매수 신호 처리 완료: ${signal.symbol} @ ${currentPrice} KRW`);

      // 손절매/익절매 모니터링 시작
      this.startMonitoring(trade.id);
    } catch (error) {
      console.error(`매수 주문 실패: ${error}`);
    }
  }

  /**
   * 매도 신호 처리
   */
  private async handleSellSignal(signal: TradingViewSignal): Promise<void> {
    const market = `KRW-${signal.symbol}`;

    // 해당 코인의 보유량 조회
    const { balance, avgBuyPrice } = await this.upbit.getCoinBalance(signal.symbol);

    if (balance <= 0) {
      console.log(`보유 중인 ${signal.symbol}이 없습니다.`);
      return;
    }

    try {
      // 현재 가격 조회
      const ticker = await this.upbit.getTicker(market);
      const currentPrice = ticker.trade_price;

      // 시장가 매도
      await this.upbit.sellMarket(market, balance);

      // 손익 계산
      const pnl = (currentPrice - avgBuyPrice) * balance;
      const pnlPercent = ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100;

      // 활성 거래 종료
      const tradeId = Array.from(this.activeTrades.entries()).find(
        ([_, trade]) => trade.symbol === signal.symbol && trade.status === "open"
      )?.[0];

      if (tradeId) {
        const trade = this.activeTrades.get(tradeId)!;
        trade.status = "closed";
        trade.closePrice = currentPrice;
        trade.closeTime = new Date().toISOString();
        trade.pnl = pnl;

        // 거래 이력에 추가
        this.tradeHistory.push({
          id: uuidv4(),
          symbol: signal.symbol,
          side: "buy",
          entryPrice: trade.entryPrice,
          exitPrice: currentPrice,
          quantity: balance,
          totalKRW: trade.totalKRW,
          pnl,
          pnlPercent,
          openTime: trade.openTime,
          closeTime: new Date().toISOString(),
          reason: "manual",
        });

        // 일일 손실액 업데이트
        if (pnl < 0) {
          this.dailyLoss += Math.abs(pnl);
        }
      }

      console.log(
        `매도 신호 처리 완료: ${signal.symbol} @ ${currentPrice} KRW (손익: ${pnl.toFixed(0)} KRW, ${pnlPercent.toFixed(2)}%)`
      );
    } catch (error) {
      console.error(`매도 주문 실패: ${error}`);
    }
  }

  /**
   * 손절매/익절매 모니터링
   */
  private startMonitoring(tradeId: string): void {
    const monitorInterval = setInterval(async () => {
      const trade = this.activeTrades.get(tradeId);

      if (!trade || trade.status === "closed") {
        clearInterval(monitorInterval);
        return;
      }

      try {
        const ticker = await this.upbit.getTicker(`KRW-${trade.symbol}`);
        const currentPrice = ticker.trade_price;

        // 익절매 체크
        if (currentPrice >= trade.takeProfit) {
          await this.closeTrade(trade, currentPrice, "take_profit");
          clearInterval(monitorInterval);
        }
        // 손절매 체크
        else if (currentPrice <= trade.stopLoss) {
          await this.closeTrade(trade, currentPrice, "stop_loss");
          clearInterval(monitorInterval);
        }
      } catch (error) {
        console.error(`모니터링 중 오류: ${error}`);
      }
    }, 5000); // 5초마다 체크
  }

  /**
   * 거래 종료
   */
  private async closeTrade(
    trade: ActiveTrade,
    exitPrice: number,
    reason: "stop_loss" | "take_profit" | "manual"
  ): Promise<void> {
    const market = `KRW-${trade.symbol}`;

    try {
      await this.upbit.sellMarket(market, trade.quantity);

      const pnl = (exitPrice - trade.entryPrice) * trade.quantity;
      const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

      trade.status = "closed";
      trade.closePrice = exitPrice;
      trade.closeTime = new Date().toISOString();
      trade.pnl = pnl;

      this.tradeHistory.push({
        id: uuidv4(),
        symbol: trade.symbol,
        side: "buy",
        entryPrice: trade.entryPrice,
        exitPrice,
        quantity: trade.quantity,
        totalKRW: trade.totalKRW,
        pnl,
        pnlPercent,
        openTime: trade.openTime,
        closeTime: new Date().toISOString(),
        reason,
      });

      // 일일 손실액 업데이트
      if (pnl < 0) {
        this.dailyLoss += Math.abs(pnl);
      }

      const reasonText =
        reason === "take_profit" ? "익절매" : reason === "stop_loss" ? "손절매" : "수동 종료";
      console.log(
        `거래 종료 (${reasonText}): ${trade.symbol} @ ${exitPrice} KRW (손익: ${pnl.toFixed(0)} KRW, ${pnlPercent.toFixed(2)}%)`
      );
    } catch (error) {
      console.error(`거래 종료 중 오류: ${error}`);
    }
  }

  /**
   * 활성 거래 조회
   */
  getActiveTrades(): ActiveTrade[] {
    return Array.from(this.activeTrades.values());
  }

  /**
   * 거래 이력 조회
   */
  getTradeHistory(): TradeHistory[] {
    return this.tradeHistory;
  }

  /**
   * 일일 손실액 조회
   */
  getDailyLoss(): number {
    return this.dailyLoss;
  }

  /**
   * 일일 손실액 리셋 (매일 자정에 호출)
   */
  resetDailyLoss(): void {
    this.dailyLoss = 0;
    this.dayStart = new Date();
    console.log("일일 손실액이 리셋되었습니다.");
  }

  /**
   * 모든 활성 거래 강제 종료
   */
  async closeAllTrades(): Promise<void> {
    const activeTrades = Array.from(this.activeTrades.values()).filter(
      (t) => t.status === "open"
    );

    for (const trade of activeTrades) {
      try {
        const ticker = await this.upbit.getTicker(`KRW-${trade.symbol}`);
        await this.closeTrade(trade, ticker.trade_price, "manual");
      } catch (error) {
        console.error(`거래 강제 종료 실패: ${error}`);
      }
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<TradeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("설정이 업데이트되었습니다.");
  }
}
