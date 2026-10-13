import { Market, OrderBookData, OrderBookLevel } from '@/lib/types';

const DEPTH_URL = 'https://api.kraken.com/0/public/Depth';

/**
 * Загружает стакан ордеров с Kraken (публичный REST, без ключа).
 *
 * Особенности:
 *  - BTC на Kraken исторически называется "XBT" (например пара "XBTUSD"), это учтено в toExchangeSymbol.
 *  - Ответ: { error: [...], result: { <нормализованное_имя_пары>: { asks: [[price, volume, ts], ...], bids: [...] } } }
 *    Ключ внутри result Kraken может отличаться от переданного pair (напр. "XXBTZUSD"),
 *    поэтому берём Object.values(result)[0], а не result[pair] напрямую.
 *  - count — глубина с каждой стороны, максимум 500.
 */
export async function fetchKrakenOrderBook(symbol: string, market: Market): Promise<OrderBookData> {
  if (market !== 'spot') {
    throw new Error('Kraken поддерживается в этом сервисе только на споте');
  }

  const url = `${DEPTH_URL}?pair=${encodeURIComponent(symbol)}&count=500`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Kraken API вернул ошибку ${res.status}: ${body || res.statusText}`);
  }

  const json = (await res.json()) as {
    error: string[];
    result: Record<string, { bids: [string, string, number][]; asks: [string, string, number][] }>;
  };

  if (json.error?.length) {
    throw new Error(`Kraken API: ${json.error.join(', ')}`);
  }

  const pairData = Object.values(json.result)[0];
  if (!pairData) {
    throw new Error(`Kraken не вернул данные по паре ${symbol}`);
  }

  const toLevels = (raw: [string, string, number][]): OrderBookLevel[] =>
    raw.map(([price, volume]) => ({ price: parseFloat(price), amount: parseFloat(volume) }));

  return {
    exchange: 'kraken',
    symbol,
    market,
    bids: toLevels(pairData.bids),
    asks: toLevels(pairData.asks),
    fetchedAt: Date.now()
  };
}
