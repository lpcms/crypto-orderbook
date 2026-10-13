'use client';

import { OrderBookLevel } from '@/lib/types';

interface Props {
  side: 'bid' | 'ask';
  levels: OrderBookLevel[];
  /** Максимальный объём среди видимых строк bid+ask — 100% шкалы. */
  maxAmount: number;
  /** Базовый актив (например "BTC") — для подписи единицы измерения объёма. */
  asset: string;
}

function formatNumber(n: number, digits = 2) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export default function OrderBookSide({ side, levels, maxAmount, asset }: Props) {
  const isBid = side === 'bid';

  return (
    <div>
      <div
        className="flex justify-between px-2 py-2 text-xs uppercase tracking-wider text-slate-700 font-medium"
        style={{ border: '1px solid #ccc', backgroundColor: '#fafafa' }}
      >
        <span>{isBid ? 'BID - Покупка' : 'ASK - Продажа'}</span>
        <span>Объём, {asset}</span>
      </div>
      <div>
        {levels.map((lvl, i) => {
          // Бар строки = её собственный объём относительно максимального
          // среди видимых строк (не накопленный) — так видно реальные "стены".
          const fillPct = Math.min(100, (lvl.amount / maxAmount) * 100);
          return (
            <div key={`${side}-${lvl.price}-${i}`} className="relative h-6">
              <div
                className={`absolute inset-y-0 ${
                  isBid ? 'right-0 bg-emerald-400/50' : 'left-0 bg-rose-400/50'
                }`}
                style={{ width: `${fillPct}%` }}
              />
              <div className="relative flex justify-between px-2 h-full items-center text-[13px]">
                <span className={isBid ? 'text-emerald-400' : 'text-rose-400'}>
                  {formatNumber(lvl.price, 1)}
                </span>
                <span className="text-slate-300">{formatNumber(lvl.amount, 4)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
