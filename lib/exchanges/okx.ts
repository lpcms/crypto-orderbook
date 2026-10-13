import { Market, OrderBookData, OrderBookLevel } from '@/lib/types';

const BOOKS_URL = 'https://www.okx.com/api/v5/market/books';

/**
 * Загружает стакан ордеров с OKX (публичный REST v5, без ключа).
 *
 * Особенности:
 *  - instId для спота: "BTC-USDT"; для бессрочных фьючерсов (swap): "BTC-USDT-SWAP".
 *    Это разные инструменты, поэтому формат символа зависит от market (см. toExchangeSymbol).
 *  - sz — глубина с каждой стороны, максимум 400.
 *  - Ответ: { code, msg, data: [{ asks: [[px, sz, liqOrders, numOrders], ...], bids: [...] }] }
 *    code !== "0" означает ошибку.
 *  - liqOrders и numOrders в уровне нам не нужны — берём только price и size.
 */
export async function fetchOkxOrderBook(symbol: string, market: Market): Promise<OrderBookData> {
  const url = `${BOOKS_URL}?instId=${encodeURIComponent(symbol)}&sz=400`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OKX API вернул ошибку ${res.status}: ${body || res.statusText}`);
  }

  const json = (await res.json()) as {
    code: string;
    msg: string;
    data: { asks: [string, string, string, string][]; bids: [string, string, string, string][] }[];
  };

  if (json.code !== '0') {
    throw new Error(`OKX API: ${json.msg} (код ${json.code})`);
  }

  const book = json.data[0];
  if (!book) {
    throw new Error(`OKX не вернул данные по инструменту ${symbol}`);
  }

  const toLevels = (raw: [string, string, string, string][]): OrderBookLevel[] =>
    raw.map(([price, size]) => ({ price: parseFloat(price), amount: parseFloat(size) }));

  return {
    exchange: 'okx',
    symbol,
    market,
    bids: toLevels(book.bids),
    asks: toLevels(book.asks),
    fetchedAt: Date.now()
  };
}
