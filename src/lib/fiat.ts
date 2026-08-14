import { consoleError } from './logs'
import { Currencies, Unit } from './types'

export interface FiatPrices {
  eur: number
  usd: number
  chf: number
  jpy: number
  gbp: number
  cny: number
  brl: number
  cup?: number
}

// Currencies listed here are prefixed with their symbol when displaying amounts.
// Those omitted (BRL, CHF, CNY, CUP) keep the trailing ISO code. BRL is explicit by
// product convention, while CNY skips ¥ to avoid clashing with JPY, and CUP has no
// widely-recognized currency symbol.
export const FIAT_SYMBOLS: Partial<Record<Currencies, string>> = {
  [Currencies.USD]: '$',
  [Currencies.EUR]: '€',
  [Currencies.GBP]: '£',
  [Currencies.JPY]: '¥',
}

export const fiatDecimalsFor = (currency: Currencies, bitcoinUnit = Unit.BTC): number => {
  if (currency === Currencies.BTC) return bitcoinUnit === Unit.BTC ? 8 : 0
  return currency === Currencies.JPY ? 0 : 2
}

export const getPriceFeed = async (): Promise<FiatPrices | undefined> => {
  try {
    const resp = await fetch('https://blockchain.info/ticker')
    const json = await resp.json()
    return {
      eur: json.EUR?.last,
      usd: json.USD?.last,
      chf: json.CHF?.last,
      jpy: json.JPY?.last,
      gbp: json.GBP?.last,
      cny: json.CNY?.last,
      brl: json.BRL?.last,
      cup: await getCupPrice(),
    }
  } catch (err) {
    consoleError(err, 'error fetching fiat prices')
  }
}

// blockchain.info does not quote the Cuban peso; Yadio.io (a Cuban market-data
// provider) publishes the BTC->CUP rate. Fetched separately so a failure there
// degrades only the CUP display, never the rest of the feed.
const getCupPrice = async (): Promise<number | undefined> => {
  try {
    const resp = await fetch('https://api.yadio.io/exrates/BTC')
    const json = await resp.json()
    return json?.BTC?.CUP
  } catch (err) {
    consoleError(err, 'error fetching CUP price')
  }
}
