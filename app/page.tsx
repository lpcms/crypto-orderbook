'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OrderBook from '@/components/OrderBook';
import { suggestTick, tickOptions } from '@/lib/aggregate';
import { loadSetting, saveSetting } from '@/lib/storage';
import {
  EXCHANGE_ASSETS,
  Exchange,
  Market,
  OrderBookData,
  SUPPORTED_MARKETS,
  toExchangeSymbol
} from '@/lib/types';

const DISPLAY_ROWS = 50;

// Базовый интервал автообновления берём из .env (по умолчанию 5 минут = 300 сек),
// два следующих варианта — умножение на 2: 5м -> 10м -> 20м.
const REFRESH_BASE_SECONDS = Number(process.env.NEXT_PUBLIC_ORDERBOOK_REFRESH_SECONDS ?? 300);
const REFRESH_OPTIONS_SECONDS = [
  REFRESH_BASE_SECONDS,
  REFRESH_BASE_SECONDS * 2,
  REFRESH_BASE_SECONDS * 4
];

const EXCHANGE_LABELS: Record<Exchange, string> = {
  binance: 'Binance',
  coinbase: 'Coinbase',
  bitfinex: 'Bitfinex',
  bybit: 'Bybit',
  kraken: 'Kraken',
  okx: 'OKX'
};

function formatMinutes(seconds: number): string {
  const minutes = seconds / 60;
  return `${minutes % 1 === 0 ? minutes : minutes.toFixed(1)}м`;
}

export default function Home() {
  // Стартовые значения — дефолтные; реальные сохранённые значения подтягиваются
  // в useEffect ниже (localStorage недоступен на сервере при первом рендере).
  const [exchange, setExchange] = useState<Exchange>('binance');
  const [asset, setAsset] = useState('BTC');
  const [market, setMarket] = useState<Market>('spot');
  const [tick, setTick] = useState<number | null>(null); // null = авто-подбор по цене
  const [refreshSeconds, setRefreshSeconds] = useState(REFRESH_BASE_SECONDS);

  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_BASE_SECONDS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Подтягиваем сохранённые настройки из localStorage один раз при монтировании.
  useEffect(() => {
    setExchange(loadSetting('exchange', 'binance' as Exchange));
    setAsset(loadSetting('asset', 'BTC'));
    setMarket(loadSetting('market', 'spot' as Market));
    setTick(loadSetting<number | null>('tick', null));
    setRefreshSeconds(loadSetting('refreshSeconds', REFRESH_BASE_SECONDS));
    setSettingsLoaded(true);
  }, []);

  const availableAssets = EXCHANGE_ASSETS[exchange];
  const availableMarkets = SUPPORTED_MARKETS[exchange];
  // Актив и рынок, которые реально есть на выбранной бирже, вычисляются прямо при
  // рендере. Иначе при переключении (например Binance BNB/futures -> Bitfinex) сначала
  // уходил запрос с невалидной парой (tBNBUSD / futures), его ошибка приходила
  // после успешного ответа и перекрывала уже загруженный стакан.
  const activeAsset = availableAssets.includes(asset) ? asset : availableAssets[0];
  const activeMarket = availableMarkets.includes(market) ? market : availableMarkets[0];
  const symbol = toExchangeSymbol(exchange, activeAsset, activeMarket);

  const midPrice = data ? (data.bids[0]?.price ?? data.asks[0]?.price ?? 0) : 0;
  const effectiveTick = tick ?? suggestTick(midPrice || 100);
  const tickChoices = useMemo(() => tickOptions(midPrice || 100), [midPrice]);

  // Номер последнего запроса: ответ (или ошибка) устаревшего запроса, который
  // пришёл позже свежего, игнорируется и не затирает актуальный стакан.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orderbook?exchange=${exchange}&symbol=${symbol}&market=${activeMarket}`,
        { cache: 'no-store' }
      );
      const json = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (!res.ok) throw new Error(json.error ?? 'Неизвестная ошибка');
      setData(json as OrderBookData);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setSecondsLeft(refreshSeconds);
      }
    }
  }, [exchange, symbol, activeMarket, refreshSeconds]);

  // Синхронизируем состояние с валидными значениями, чтобы в localStorage не
  // оставалась пара, которой нет на бирже (запрос уже идёт с activeAsset/activeMarket).
  useEffect(() => {
    if (asset !== activeAsset) setAsset(activeAsset);
    if (market !== activeMarket) setMarket(activeMarket);
  }, [asset, activeAsset, market, activeMarket]);

  // Загрузка при первом рендере (после подтягивания настроек) и при смене биржи/символа/рынка
  useEffect(() => {
    if (!settingsLoaded) return;
    load();
  }, [load, settingsLoaded]);

  // Сохраняем настройки при каждом изменении
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSetting('exchange', exchange);
  }, [exchange, settingsLoaded]);
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSetting('asset', asset);
  }, [asset, settingsLoaded]);
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSetting('market', market);
  }, [market, settingsLoaded]);
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSetting('tick', tick);
  }, [tick, settingsLoaded]);
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSetting('refreshSeconds', refreshSeconds);
    setSecondsLeft(refreshSeconds);
  }, [refreshSeconds, settingsLoaded]);

  // Обратный отсчёт + авто-обновление раз в refreshSeconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          load();
          return refreshSeconds;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load, refreshSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <main className="min-h-screen bg-[#0a0f17] px-4 py-8 md:px-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
            Order Book <span className="text-accent">/ {EXCHANGE_LABELS[exchange]}</span>{' '}
            <span className="text-slate-400 text-sm font-normal">
              [Стакан заявок в реальном времени]
            </span>
          </h1>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="asset-select">
            Монета
          </label>
          <select
            id="asset-select"
            value={activeAsset}
            onChange={(e) => setAsset(e.target.value)}
            className="bg-panelAlt border border-line rounded-md px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {availableAssets.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <div
            role="group"
            aria-label="Биржа"
            className="flex rounded-md border border-line overflow-hidden text-sm"
          >
            {(Object.keys(EXCHANGE_LABELS) as Exchange[]).map((ex) => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                aria-pressed={exchange === ex}
                className={`px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                  exchange === ex
                    ? 'bg-accent text-[#1a1305] font-medium'
                    : 'bg-panelAlt text-slate-300 hover:text-slate-100'
                }`}
              >
                {EXCHANGE_LABELS[ex]}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Рынок: спот или фьючерсы"
            className="flex rounded-md border border-line overflow-hidden text-sm"
          >
            {(['spot', 'futures'] as Market[]).map((m) => {
              const disabled = !availableMarkets.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => !disabled && setMarket(m)}
                  disabled={disabled}
                  aria-pressed={activeMarket === m}
                  title={
                    disabled
                      ? `${EXCHANGE_LABELS[exchange]} не поддерживает ${m} в этом сервисе`
                      : undefined
                  }
                  className={`px-3 py-2.5 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                    disabled
                      ? 'bg-panelAlt/40 text-slate-600 cursor-not-allowed'
                      : activeMarket === m
                        ? 'bg-accent text-[#1a1305] font-medium'
                        : 'bg-panelAlt text-slate-300 hover:text-slate-100'
                  }`}
                >
                  {m === 'spot' ? 'Спот' : 'Фьючерсы'}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span id="tick-label">Группировка</span>
            <div
              role="group"
              aria-labelledby="tick-label"
              className="flex rounded-md border border-line overflow-hidden text-sm"
            >
              {tickChoices.map((t) => (
                <button
                  key={t}
                  onClick={() => setTick(t)}
                  aria-pressed={effectiveTick === t}
                  className={`px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                    effectiveTick === t
                      ? 'bg-accent text-[#1a1305] font-medium'
                      : 'bg-panelAlt text-slate-300 hover:text-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span id="refresh-label">Автообновление</span>
            <div
              role="group"
              aria-labelledby="refresh-label"
              className="flex rounded-md border border-line overflow-hidden text-sm"
            >
              {REFRESH_OPTIONS_SECONDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setRefreshSeconds(s)}
                  aria-pressed={refreshSeconds === s}
                  className={`px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                    refreshSeconds === s
                      ? 'bg-accent text-[#1a1305] font-medium'
                      : 'bg-panelAlt text-slate-300 hover:text-slate-100'
                  }`}
                >
                  {formatMinutes(s)}
                </button>
              ))}
            </div>

            <span className="flex items-center gap-1 tabular-nums" aria-live="polite">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className={loading ? 'animate-spin' : ''}
              >
                <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              <span className="sr-only">Автообновление через</span>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>

            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-2.5 rounded-md border border-white/80 bg-panelAlt text-sm text-slate-100 hover:bg-white/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {loading ? 'Обновление…' : 'Обновить'}
            </button>
          </div>
        </div>

        <OrderBook
          data={data}
          loading={loading}
          error={error}
          tick={effectiveTick}
          rows={DISPLAY_ROWS}
          asset={activeAsset}
        />
      </div>
    </main>
  );
}
