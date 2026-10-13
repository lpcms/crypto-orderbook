import { Market, OrderBookData, OrderBookLevel } from '@/lib/types';

const ORDERBOOK_URL = 'https://api.bybit.com/v5/market/orderbook';

/**
 * Загружает стакан ордеров с Bybit (публичный REST v5, без ключа).
 *
 * Особенности:
 *  - category зависит от рынка: "spot" для спота, "linear" для USDT-M бессрочных фьючерсов.
 *  - Символ одинаковый для обеих категорий: "BTCUSDT".
 *  - Максимальный limit различается: spot — 200, linear — 500.
 *  - Ответ: { retCode, retMsg, result: { b: [[price, size], ...], a: [[price, size], ...] } }
 *    retCode !== 0 означает ошибку (например неверный символ).
 */
export async function fetchBybitOrderBook(symbol: string, market: Market): Promise<OrderBookData> {
  const category = market === 'spot' ? 'spot' : 'linear';
  const limit = market === 'spot' ? 200 : 500;

  const url = `${ORDERBOOK_URL}?category=${category}&symbol=${encodeURIComponent(
    symbol.toUpperCase()
  )}&limit=${limit}`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bybit API вернул ошибку ${res.status}: ${body || res.statusText}`);
  }

  const json = (await res.json()) as {
    retCode: number;
    retMsg: string;
    result: { b: [string, string][]; a: [string, string][] };
  };

  if (json.retCode !== 0) {
    throw new Error(`Bybit API: ${json.retMsg} (код ${json.retCode})`);
  }

  const toLevels = (raw: [string, string][]): OrderBookLevel[] =>
    raw.map(([price, amount]) => ({ price: parseFloat(price), amount: parseFloat(amount) }));

  return {
    exchange: 'bybit',
    symbol: symbol.toUpperCase(),
    market,
    bids: toLevels(json.result.b),
    asks: toLevels(json.result.a),
    fetchedAt: Date.now()
  };
}
