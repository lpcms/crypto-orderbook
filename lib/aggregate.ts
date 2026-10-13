import { OrderBookLevel } from './types';

/**
 * Группирует уровни стакана по шагу цены (price grouping) — та же техника,
 * что использует UI самих бирж (Binance/Coinbase: селектор "0.1 / 1 / 10 / 100").
 *
 * Позволяет взять ПОЛНУЮ глубину (до 5000 уровней с Binance REST) и свернуть её
 * в компактную, но информативную таблицу: цены, попадающие в один шаг `tick`,
 * схлопываются в один уровень с суммой объёмов.
 *
 * side влияет на направление округления:
 *  - bid округляется ВНИЗ (к более консервативной, чуть менее выгодной цене покупателя)
 *  - ask округляется ВВЕРХ (аналогично для продавца)
 * Это стандартное поведение стаканов на биржах — не завышает кажущуюся ликвидность.
 */
export function groupLevels(
  levels: OrderBookLevel[],
  tick: number,
  side: 'bid' | 'ask'
): OrderBookLevel[] {
  if (tick <= 0) return levels;

  const buckets = new Map<number, number>();

  for (const { price, amount } of levels) {
    const rawBucket =
      side === 'bid' ? Math.floor(price / tick) * tick : Math.ceil(price / tick) * tick;

    // Защита от вырожденного случая: если сама цена меньше шага группировки
    // (например шаг 10000, а в стакане есть дальняя дешёвая заявка по 9000),
    // Math.floor(price / tick) даёт 0 — и ВСЕ такие разные по смыслу цены
    // схлопнулись бы в один уровень "0" с суммой их объёмов. Это не отражает
    // реальный стакан, а маскирует его. Вместо этого такие уровни оставляем
    // как есть, под их собственной ценой, не группируя дальше.
    const bucketPrice = rawBucket > 0 ? rawBucket : price;

    buckets.set(bucketPrice, (buckets.get(bucketPrice) ?? 0) + amount);
  }

  const grouped = Array.from(buckets.entries())
    .map(([price, amount]) => ({ price, amount }))
    .filter((l) => l.price > 0); // на всякий случай отсекаем нулевые/некорректные цены от биржи

  // bid — по убыванию цены (сверху лучшая), ask — по возрастанию
  grouped.sort((a, b) => (side === 'bid' ? b.price - a.price : a.price - b.price));

  return grouped;
}

/**
 * Подбирает разумный шаг группировки исходя из цены актива, чтобы по умолчанию
 * таблица не превращалась в 5000 строк. Пользователь может переопределить шаг вручную.
 */
export function suggestTick(price: number): number {
  if (price >= 10000) return 10;
  if (price >= 1000) return 1;
  if (price >= 100) return 0.1;
  if (price >= 10) return 0.01;
  if (price >= 1) return 0.001;
  return 0.0001;
}

/** Набор шагов, которые можно предложить пользователю в UI, вокруг suggestTick. */
export function tickOptions(price: number): number[] {
  const base = suggestTick(price);
  return [base / 10, base, base * 10, base * 100, base * 1000].filter((t) => t > 0);
}
