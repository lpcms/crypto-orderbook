import { NextRequest, NextResponse } from 'next/server';
import { fetchOrderBook } from '@/lib/exchanges';
import { Exchange, Market } from '@/lib/types';

export const dynamic = 'force-dynamic';

const KNOWN_EXCHANGES: Exchange[] = ['binance', 'coinbase', 'bitfinex', 'bybit', 'kraken', 'okx'];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') ?? 'BTCUSDT';
  const market = (searchParams.get('market') as Market) ?? 'spot';
  const exchange = (searchParams.get('exchange') as Exchange) ?? 'binance';

  if (!KNOWN_EXCHANGES.includes(exchange)) {
    return NextResponse.json({ error: `Неизвестная биржа: ${exchange}` }, { status: 400 });
  }
  if (market !== 'spot' && market !== 'futures') {
    return NextResponse.json(
      { error: "Параметр market должен быть 'spot' или 'futures'" },
      { status: 400 }
    );
  }

  const depthLimit = Number(process.env.ORDERBOOK_DEPTH_LIMIT ?? 5000);

  try {
    const data = await fetchOrderBook(exchange, symbol, market, depthLimit);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
