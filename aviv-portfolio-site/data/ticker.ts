/**
 * The green LED ticker under the menu (NYSE-style). What it says is written
 * in /admin → "Ticker". With no lines written, it shows the placeholder stock
 * quotes below with prices that drift up and down (simulated — not real
 * market data).
 */

/** 'left' = text runs right-to-left, like a real stock ticker; 'right' = left-to-right. */
export const TICKER_DIRECTION: 'left' | 'right' = 'left'
/** speed in pixels per second */
export const TICKER_SPEED = 70

/** Placeholder quotes: symbol + a starting price. */
export const PLACEHOLDER_QUOTES: { sym: string; price: number }[] = [
  { sym: 'NYSE', price: 19842.17 },
  { sym: 'DJIA', price: 44310.62 },
  { sym: 'AAPL', price: 227.52 },
  { sym: 'MSFT', price: 431.18 },
  { sym: 'NVDA', price: 118.4 },
  { sym: 'AMZN', price: 186.33 },
  { sym: 'TSLA', price: 248.91 },
  { sym: 'GOOGL', price: 165.07 },
  { sym: 'META', price: 572.6 },
  { sym: 'NFLX', price: 701.45 },
  { sym: 'DIS', price: 94.12 },
  { sym: 'KO', price: 71.88 },
  { sym: 'NKE', price: 82.3 },
  { sym: 'JPM', price: 214.55 },
  { sym: 'CRSPY', price: 14.04 },
]
