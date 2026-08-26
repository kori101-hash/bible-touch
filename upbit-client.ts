import crypto from "crypto";

interface UpbitConfig {
  apiKey: string;
  apiSecret: string;
}

interface OrderRequest {
  market: string;
  side: "bid" | "ask";
  price?: number;
  ord_type: "limit" | "price" | "market";
  volume?: number;
}

interface Account {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  avg_buy_price_modified: boolean;
  unit_currency: string;
}

interface OrderBook {
  market: string;
  timestamp: number;
  orderbook: {
    ask_prices: number[];
    bid_prices: number[];
    ask_volumes: number[];
    bid_volumes: number[];
  }[];
}

interface Ticker {
  market: string;
  candle_type: string;
  candle_date_time_utc: string;
  candle_date_time_kst: string;
  opening_price: number;
  high_price: number;
  low_price: number;
  trade_price: number;
  timestamp: number;
  candle_acc_trade_price: number;
  candle_acc_trade_volume: number;
  prev_closing_price: number;
  change_price: number;
  change_rate: number;
  signed_change_price: number;
  signed_change_rate: number;
  trade_volume: number;
  acc_trade_price: number;
  acc_trade_price_24h: number;
  acc_trade_volume: number;
  acc_trade_volume_24h: number;
  highest_52_week_price: number;
  highest_52_week_date: string;
  lowest_52_week_price: number;
  lowest_52_week_date: string;
  trade_status: string;
  market_order_enabled: boolean;
  ask_bid: string;
  acc_trade_price_24h_utc: number;
  acc_trade_volume_24h_utc: number;
}

export class UpbitClient {
  private apiKey: string;
  private apiSecret: string;
  private baseURL = "https://api.upbit.com/v1";
  private requestTimeout = 10000; // 10초 타임아웃

  constructor(config: UpbitConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  private generateSignature(query: string): string {
    const message = crypto.createHmac("sha256", this.apiSecret);
    message.update(query);
    return message.digest("hex");
  }

  private async request(
    method: string,
    endpoint: string,
    query?: Record<string, any>,
    body?: Record<string, any>
  ): Promise<any> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    let requestBody = "";

    // 인증이 필요한 요청(GET /accounts, DELETE, POST 등)에는 항상 서명 추가
    const requiresAuth = ["GET", "POST", "DELETE", "PUT"].includes(method);

    if (requiresAuth) {
      const queryString = query
        ? new URLSearchParams(
            Object.entries(query).reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>)
          ).toString()
        : "";

      const signature = this.generateSignature(queryString);
      headers["X-Payload"] = Buffer.from(queryString).toString("base64");
      headers["X-Signature"] = signature;

      if (queryString) {
        url.search = queryString;
      }
    }

    if (body) {
      requestBody = JSON.stringify(body);
    }

    let response;
    try {
      response = await Promise.race([
        fetch(url.toString(), {
          method,
          headers,
          body: requestBody || undefined,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.requestTimeout)
        ),
      ]) as Response;
    } catch (fetchError: any) {
      if (fetchError.message === "Request timeout") {
        throw new Error("Upbit API 요청이 타임아웃되었습니다. 나중에 다시 시도해주세요.");
      }
      throw new Error(`Network error: ${fetchError.message}`);
    }

    const responseText = await response.text();

    if (!response.ok) {
      // HTML 오류 페이지인 경우 감지
      if (responseText.includes("<html") || responseText.includes("<!DOCTYPE")) {
        throw new Error(
          `Upbit API server error (${response.status}). API URL이 올바른지 확인해주세요.`
        );
      }

      // JSON 오류 응답 시도
      try {
        const error = JSON.parse(responseText);
        throw new Error(
          `Upbit API Error: ${error.error?.name || "Unknown Error"} - ${
            error.error?.message || response.statusText
          }`
        );
      } catch (parseError) {
        // JSON 파싱 실패 시 원본 텍스트 사용
        throw new Error(
          `Upbit API Error (${response.status}): ${responseText.substring(0, 200) || response.statusText}`
        );
      }
    }

    if (!responseText) {
      throw new Error("Upbit API returned empty response");
    }

    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
  }

  // 계좌 조회
  async getAccounts(): Promise<Account[]> {
    return this.request("GET", "/accounts");
  }

  // 현재 가격 조회
  async getTicker(market: string): Promise<Ticker> {
    const [data] = await this.request("GET", "/ticker", { markets: market });
    return data;
  }

  // 주문 생성
  async createOrder(order: OrderRequest): Promise<any> {
    return this.request("POST", "/orders", undefined, order);
  }

  // 주문 취소
  async cancelOrder(uuid: string): Promise<any> {
    return this.request("DELETE", "/orders", { uuid });
  }

  // 주문 조회
  async getOrder(uuid: string): Promise<any> {
    return this.request("GET", "/order", { uuid });
  }

  // 열린 주문 조회
  async getOpenOrders(): Promise<any[]> {
    return this.request("GET", "/orders", { state: "wait" });
  }

  // KRW 잔액 조회
  async getKRWBalance(): Promise<number> {
    const accounts = await this.getAccounts();
    const krwAccount = accounts.find((acc) => acc.currency === "KRW");
    return krwAccount ? parseFloat(krwAccount.balance) : 0;
  }

  // 특정 코인의 보유량 조회
  async getCoinBalance(coin: string): Promise<{ balance: number; avgBuyPrice: number }> {
    const accounts = await this.getAccounts();
    const account = accounts.find((acc) => acc.currency === coin);
    if (!account) {
      return { balance: 0, avgBuyPrice: 0 };
    }
    return {
      balance: parseFloat(account.balance),
      avgBuyPrice: parseFloat(account.avg_buy_price),
    };
  }

  // 시장가 매수
  async buyMarket(market: string, price: number): Promise<any> {
    return this.createOrder({
      market,
      side: "bid",
      price,
      ord_type: "price",
    });
  }

  // 시장가 매도
  async sellMarket(market: string, volume: number): Promise<any> {
    return this.createOrder({
      market,
      side: "ask",
      volume,
      ord_type: "market",
    });
  }

  // 지정가 매수
  async buyLimit(market: string, price: number, volume: number): Promise<any> {
    return this.createOrder({
      market,
      side: "bid",
      price,
      volume,
      ord_type: "limit",
    });
  }

  // 지정가 매도
  async sellLimit(market: string, price: number, volume: number): Promise<any> {
    return this.createOrder({
      market,
      side: "ask",
      price,
      volume,
      ord_type: "limit",
    });
  }
}
