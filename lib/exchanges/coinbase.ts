import { Market, OrderBookData, OrderBookLevel } from '@/lib/types';

const BOOK_URL = 'https://api.exchange.coinbase.com/products';

/**
 * Загружает стакан ордеров с Coinbase Exchange (публичный REST, без ключа).
 *
 * Важное отличие от Binance:
 *  - level=2 отдаёт ПОЛНЫЙ стакан, уже агрегированный биржей по цене (одна строка
 *    на цену, для BTC-USD это ~20 000 уровней с каждой стороны). level=3, где
 *    КАЖДЫЙ ордер идёт отдельной строкой, избыточно тяжёл — используем level=2.
 *  - фьючерсов/деривативов в этом публичном API нет — только спот.
 *  - формат ответа: { bids: [[price, size, num-orders], ...], asks: [...] }
 */
export async function fetchCoinbaseOrderBook(
  symbol: string,
  market: Market
): Promise<OrderBookData> {
  if (market !== 'spot') {
    throw new Error('Coinbase поддерживает в этом сервисе только спот-рынок');
  }

  const url = `${BOOK_URL}/${encodeURIComponent(symbol.toUpperCase())}/book?level=2`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Coinbase API вернул ошибку ${res.status}: ${body || res.statusText}`);
  }

  const json = (await res.json()) as {
    bids: [string, string, number | string][];
    asks: [string, string, number | string][];
  };

  const toLevels = (raw: [string, string, number | string][]): OrderBookLevel[] =>
    raw.map(([price, size]) => ({ price: parseFloat(price), amount: parseFloat(size) }));

  return {
    exchange: 'coinbase',
    symbol: symbol.toUpperCase(),
    market,
    bids: toLevels(json.bids),
    asks: toLevels(json.asks),
    fetchedAt: Date.now()
  };
}
