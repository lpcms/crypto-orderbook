import { Market, OrderBookData, OrderBookLevel } from '@/lib/types';

const SPOT_URL = 'https://api.binance.com/api/v3/depth';
const FUTURES_URL = 'https://fapi.binance.com/fapi/v1/depth';

// У Binance разные допустимые значения limit для spot и futures.
// Spot (api/v3/depth):     5, 10, 20, 50, 100, 500, 1000, 5000
// Futures (fapi/v1/depth): 5, 10, 20, 50, 100, 500, 1000  (5000 отклоняется с -1130)
const ALLOWED_LIMITS: Record<Market, number[]> = {
  spot: [5, 10, 20, 50, 100, 500, 1000, 5000],
  futures: [5, 10, 20, 50, 100, 500, 1000]
};

export function clampBinanceLimit(market: Market, requested: number): number {
  const allowed = ALLOWED_LIMITS[market];
  const max = allowed[allowed.length - 1];
  return allowed.includes(requested) ? requested : max;
}

/**
 * Загружает стакан ордеров с Binance.
 * Spot и Futures (USDT-M perpetual) отдаются разными эндпоинтами с одинаковой формой ответа:
 * { bids: [[price, qty], ...], asks: [[price, qty], ...] }
 */
export async function fetchBinanceOrderBook(
  symbol: string,
  market: Market,
  requestedLimit: number
): Promise<OrderBookData> {
  const limit = clampBinanceLimit(market, requestedLimit);
  const base = market === 'spot' ? SPOT_URL : FUTURES_URL;
  const url = `${base}?symbol=${encodeURIComponent(symbol.toUpperCase())}&limit=${limit}`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Binance ${market} API вернул ошибку ${res.status}: ${body || res.statusText}`);
  }

  const json = (await res.json()) as { bids: [string, string][]; asks: [string, string][] };

  const toLevels = (raw: [string, string][]): OrderBookLevel[] =>
    raw.map(([price, amount]) => ({ price: parseFloat(price), amount: parseFloat(amount) }));

  return {
    exchange: 'binance',
    symbol: symbol.toUpperCase(),
    market,
    bids: toLevels(json.bids),
    asks: toLevels(json.asks),
    fetchedAt: Date.now()
  };
}
