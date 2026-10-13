import { Market, OrderBookData, OrderBookLevel } from '@/lib/types';

const BOOK_URL = 'https://api-pub.bitfinex.com/v2/book';

/**
 * Загружает стакан ордеров с Bitfinex (публичный REST, без ключа).
 *
 * Формат сильно отличается от Binance/Coinbase:
 *  - endpoint: /v2/book/{symbol}/{precision} , symbol вида "tBTCUSD"
 *  - precision "P0" — уровень агрегации цены самой биржей (0 = минимальная агрегация,
 *    то есть максимальная детализация из доступных через этот эндпоинт)
 *  - bids и ask ПРИХОДЯТ ОДНИМ МАССИВОМ строк [PRICE, COUNT, AMOUNT]:
 *      AMOUNT > 0  -> это бид
 *      AMOUNT < 0  -> это аск (реальный объём = abs(AMOUNT))
 *    Разделяем их на клиенте по знаку.
 *  - len=250 — сколько уровней с каждой стороны просим (это максимум у Bitfinex)
 */
export async function fetchBitfinexOrderBook(
  symbol: string,
  market: Market
): Promise<OrderBookData> {
  if (market !== 'spot') {
    throw new Error('Bitfinex поддерживает в этом сервисе только спот-рынок');
  }

  const url = `${BOOK_URL}/${encodeURIComponent(symbol)}/P0?len=250`;

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bitfinex API вернул ошибку ${res.status}: ${body || res.statusText}`);
  }

  const json = (await res.json()) as [number, number, number][];

  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  for (const [price, , amount] of json) {
    if (amount > 0) {
      bids.push({ price, amount });
    } else if (amount < 0) {
      asks.push({ price, amount: Math.abs(amount) });
    }
  }

  bids.sort((a, b) => b.price - a.price);
  asks.sort((a, b) => a.price - b.price);

  return {
    exchange: 'bitfinex',
    symbol,
    market,
    bids,
    asks,
    fetchedAt: Date.now()
  };
}
