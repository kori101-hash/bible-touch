import React, { useState, useEffect } from "react";
import { AlertCircle, Play, Pause, Trash2, RefreshCw } from "lucide-react";
import type { ActiveTrade, TradeHistory } from "./types";

export default function TradingDashboard() {
  const [initialized, setInitialized] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [coins, setCoins] = useState("BTC,ETH");
  const [positionSize, setPositionSize] = useState("5");
  const [stopLoss, setStopLoss] = useState("2");
  const [takeProfit, setTakeProfit] = useState("5");
  const [maxDailyLoss, setMaxDailyLoss] = useState("500000");
  const [enabled, setEnabled] = useState(false);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [dailyLoss, setDailyLoss] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialized) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    }
  }, [initialized]);

  const refreshData = async () => {
    try {
      const [activesRes, historyRes, lossRes] = await Promise.all([
        fetch("/api/trading/active"),
        fetch("/api/trading/history"),
        fetch("/api/trading/daily-loss"),
      ]);

      if (activesRes.ok) {
        setActiveTrades(await activesRes.json());
      }
      if (historyRes.ok) {
        setTradeHistory(await historyRes.json());
      }
      if (lossRes.ok) {
        const data = await lossRes.json();
        setDailyLoss(data.dailyLoss);
      }
    } catch (err) {
      console.error("데이터 갱신 오류:", err);
    }
  };

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/trading/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          coins: coins.split(",").map((c) => c.trim()),
          positionSizePercent: parseFloat(positionSize),
          stopLossPercent: parseFloat(stopLoss),
          takeProfitPercent: parseFloat(takeProfit),
          maxDailyLoss: parseFloat(maxDailyLoss),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInitialized(true);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch("/api/trading/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (res.ok) {
        setEnabled(!enabled);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCloseAll = async () => {
    if (!confirm("모든 거래를 종료하시겠습니까?")) return;

    try {
      const res = await fetch("/api/trading/close-all", { method: "POST" });
      if (res.ok) {
        await refreshData();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!initialized) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">🤖 코인 자동매매</h1>
        <form onSubmit={handleInit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upbit API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your Upbit API Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upbit API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your Upbit API Secret"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              거래할 코인 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={coins}
              onChange={(e) => setCoins(e.target.value)}
              placeholder="BTC,ETH,XRP"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                포지션 크기 (%)
              </label>
              <input
                type="number"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                손절매 (%)
              </label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                min="0.1"
                max="10"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                익절매 (%)
              </label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                min="0.1"
                max="100"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                일일 최대 손실액 (KRW)
              </label>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(e.target.value)}
                min="10000"
                step="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "초기화 중..." : "자동매매 시작"}
          </button>
        </form>
      </div>
    );
  }

  const totalPnL = tradeHistory.reduce((sum, trade) => sum + trade.pnl, 0);
  const totalTrades = tradeHistory.length;
  const winTrades = tradeHistory.filter((t) => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : "0";

  return (
    <div className="w-full space-y-6 p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🤖 코인 자동매매 대시보드</h1>
          <div className="space-x-2">
            <button
              onClick={handleToggle}
              className={`px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 ${
                enabled ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {enabled ? (
                <>
                  <Pause className="w-4 h-4" /> 일시 중지
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 시작
                </>
              )}
            </button>
            <button
              onClick={handleCloseAll}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> 모든 거래 종료
            </button>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> 갱신
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md flex gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">상태</div>
            <div className="text-2xl font-bold text-gray-800">
              {enabled ? "🟢 활성" : "🔴 비활성"}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">총 손익</div>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPnL.toLocaleString()} KRW
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">승률</div>
            <div className="text-2xl font-bold text-gray-800">{winRate}%</div>
            <div className="text-xs text-gray-500">{totalTrades}중 {winTrades}승</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">일일 손실액</div>
            <div className={`text-2xl font-bold ${dailyLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
              {dailyLoss.toLocaleString()} KRW
            </div>
          </div>
        </div>

        {/* 활성 거래 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">활성 거래 ({activeTrades.length})</h2>
          {activeTrades.length === 0 ? (
            <p className="text-gray-500">활성 거래가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">코인</th>
                    <th className="text-left py-2 px-3">방향</th>
                    <th className="text-right py-2 px-3">진입가</th>
                    <th className="text-right py-2 px-3">손절매</th>
                    <th className="text-right py-2 px-3">익절매</th>
                    <th className="text-right py-2 px-3">수량</th>
                    <th className="text-right py-2 px-3">총액</th>
                    <th className="text-left py-2 px-3">진입 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrades.map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{trade.symbol}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {trade.side === "buy" ? "매수" : "매도"}
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">{trade.entryPrice.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{trade.stopLoss.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{trade.takeProfit.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{trade.quantity.toFixed(8)}</td>
                      <td className="text-right py-2 px-3 font-medium">
                        {trade.totalKRW.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {new Date(trade.openTime).toLocaleTimeString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 거래 이력 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">거래 이력 (최근 20건)</h2>
          {tradeHistory.length === 0 ? (
            <p className="text-gray-500">거래 이력이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">코인</th>
                    <th className="text-left py-2 px-3">방향</th>
                    <th className="text-right py-2 px-3">진입가</th>
                    <th className="text-right py-2 px-3">결산가</th>
                    <th className="text-right py-2 px-3">수량</th>
                    <th className="text-right py-2 px-3">손익</th>
                    <th className="text-right py-2 px-3">수익률</th>
                    <th className="text-left py-2 px-3">종료 사유</th>
                    <th className="text-left py-2 px-3">종료 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.slice(0, 20).map((trade) => (
                    <tr key={trade.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{trade.symbol}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {trade.side === "buy" ? "매수" : "매도"}
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">{trade.entryPrice.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{trade.exitPrice.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{trade.quantity.toFixed(8)}</td>
                      <td className={`text-right py-2 px-3 font-medium ${trade.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toLocaleString()} KRW
                      </td>
                      <td className={`text-right py-2 px-3 ${trade.pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {trade.reason === "take_profit"
                          ? "익절매"
                          : trade.reason === "stop_loss"
                            ? "손절매"
                            : "수동"}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {new Date(trade.closeTime).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
