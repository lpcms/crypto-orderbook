export type Exchange = 'binance' | 'coinbase' | 'bitfinex' | 'bybit' | 'kraken' | 'okx';
export type Market = 'spot' | 'futures';

export interface OrderBookLevel {
  price: number;
  amount: number;
}

export interface OrderBookData {
  exchange: Exchange;
  symbol: string;
  market: Market;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  fetchedAt: number;
}

/** Какие рынки реально поддерживает биржа в нашем публичном API-доступе. */
export const SUPPORTED_MARKETS: Record<Exchange, Market[]> = {
  binance: ['spot', 'futures'],
  coinbase: ['spot'], // деривативы Coinbase — отдельный продукт (Coinbase International), не публичный REST
  bitfinex: ['spot'],
  bybit: ['spot', 'futures'],
  kraken: ['spot'], // Kraken Futures — отдельный API (futures.kraken.com), не подключён
  okx: ['spot', 'futures'] // futures здесь — бессрочный своп (SWAP), самый ликвидный тип у OKX
};

/** Базовые активы, которые предлагаем в UI на каждой бирже (у всех разный листинг). */
export const EXCHANGE_ASSETS: Record<Exchange, string[]> = {
  binance: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'],
  coinbase: ['BTC', 'ETH', 'SOL', 'XRP', 'LTC'],
  bitfinex: ['BTC', 'ETH', 'SOL', 'XRP', 'LTC'],
  bybit: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB'],
  kraken: ['BTC', 'ETH', 'SOL', 'XRP', 'LTC'],
  okx: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB']
};

/** Собирает символ в формате конкретной биржи из базового актива. */
export function toExchangeSymbol(exchange: Exchange, base: string, market: Market): string {
  switch (exchange) {
    case 'binance':
      return `${base}USDT`; // одинаково для spot и USDT-M futures
    case 'coinbase':
      return `${base}-USD`;
    case 'bitfinex':
      return `t${base}USD`;
    case 'bybit':
      return `${base}USDT`;
    case 'kraken':
      // Kraken исторически зовёт биткоин "XBT", а не "BTC"
      return `${base === 'BTC' ? 'XBT' : base}USD`;
    case 'okx':
      // На споте инструмент "BTC-USDT", на бессрочном фьючерсе — "BTC-USDT-SWAP"
      return market === 'spot' ? `${base}-USDT` : `${base}-USDT-SWAP`;
  }
}
