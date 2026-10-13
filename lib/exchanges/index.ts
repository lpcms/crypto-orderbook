import { Exchange, Market, OrderBookData } from '@/lib/types';
import { fetchBinanceOrderBook } from './binance';
import { fetchCoinbaseOrderBook } from './coinbase';
import { fetchBitfinexOrderBook } from './bitfinex';
import { fetchKrakenOrderBook } from './kraken';
import { fetchBybitOrderBook } from './bybit';
import { fetchOkxOrderBook } from './okx';

/**
 * Единая точка входа для API route: не важно, с какой биржи запрашивают стакан,
 * вызывающему коду не нужно знать про особенности конкретного REST API.
 * Добавление новой биржи = новый файл в lib/exchanges + один case здесь.
 */
export async function fetchOrderBook(
  exchange: Exchange,
  symbol: string,
  market: Market,
  depthLimit: number
): Promise<OrderBookData> {
  switch (exchange) {
    case 'binance':
      return fetchBinanceOrderBook(symbol, market, depthLimit);
    case 'coinbase':
      return fetchCoinbaseOrderBook(symbol, market);
    case 'bitfinex':
      return fetchBitfinexOrderBook(symbol, market);
    case 'kraken':
      return fetchKrakenOrderBook(symbol, market);
    case 'bybit':
      return fetchBybitOrderBook(symbol, market);
    case 'okx':
      return fetchOkxOrderBook(symbol, market);
  }
}
