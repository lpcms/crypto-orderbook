'use client';

import { OrderBookData } from '@/lib/types';
import { groupLevels } from '@/lib/aggregate';
import OrderBookSide from './OrderBookSide';

interface Props {
  data: OrderBookData | null;
  loading: boolean;
  error: string | null;
  tick: number;
  rows: number;
  asset: string;
}

export default function OrderBook({ data, loading, error, tick, rows, asset }: Props) {
  if (error) {
    return (
      <div
        role="alert"
        className="border border-rose-800 bg-rose-950/40 text-rose-200 rounded-lg p-6 text-sm"
      >
        Не удалось загрузить стакан: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div role="status" className="border border-line rounded-lg p-6 text-sm text-slate-300">
        {loading ? 'Загрузка стакана…' : 'Нет данных'}
      </div>
    );
  }

  const bestBid = data.bids[0]?.price ?? 0;
  const bestAsk = data.asks[0]?.price ?? 0;
  const spread = bestAsk - bestBid;
  const spreadPct = bestBid ? (spread / bestBid) * 100 : 0;

  const groupedBids = groupLevels(data.bids, tick, 'bid').slice(0, rows);
  const groupedAsks = groupLevels(data.asks, tick, 'ask').slice(0, rows);

  // Шкала объёма строится по объёму КОНКРЕТНОГО уровня, а не по накопленному
  // (кумулятивному) объёму. Это стандарт для таблицы стакана на биржах
  // (Binance/Bybit/OKX): так сразу видно "стены" ликвидности на отдельных ценах.
  // Кумулятивный объём (running total) — это то, что рисуют в отдельном
  // depth-chart (площадном графике), а не в построчной таблице цен: в кумулятиве
  // самая дальняя от спреда строка почти всегда выглядит на 100% независимо от
  // реальной ликвидности, что искажает восприятие "где стоит крупный ордер".
  const maxAmount =
    Math.max(...groupedBids.map((l) => l.amount), ...groupedAsks.map((l) => l.amount)) || 1;

  return (
    <div
      className={`border border-line rounded-lg overflow-hidden bg-panel ${loading ? 'opacity-60' : ''} transition-opacity`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panelAlt">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-100">{data.symbol}</span>
          <span className="text-xs text-slate-400 uppercase">{data.market}</span>
          <span className="text-xs text-slate-400">
            [Обновлено: {new Date(data.fetchedAt).toLocaleTimeString('ru-RU')}]
          </span>
        </div>
        <div className="flex items-baseline gap-3 text-xs">
          <span className="text-slate-400">
            Spread <span className="text-accent">{spread.toFixed(1)}</span>{' '}
            <span className="text-slate-400">({spreadPct.toFixed(3)}%)</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-line">
        <OrderBookSide side="bid" levels={groupedBids} maxAmount={maxAmount} asset={asset} />
        <OrderBookSide side="ask" levels={groupedAsks} maxAmount={maxAmount} asset={asset} />
      </div>
      <div className="px-4 py-2 border-t border-line text-xs text-slate-400">
        Из {data.bids.length + data.asks.length} сырых уровней стакана сгруппировано в{' '}
        {groupedBids.length + groupedAsks.length} строк, шаг {tick}
      </div>
    </div>
  );
}
