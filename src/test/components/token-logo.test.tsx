import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import TokenLogo, { tokenLogoTickerForTicker, CubaFlagLogo } from '../../components/TokenLogo'

describe('tokenLogoTickerForTicker', () => {
  it('maps every supported currency ticker to a token logo ticker', () => {
    for (const ticker of ['BTC', 'USD', 'USDT', 'USDC', 'CHF', 'BRL', 'CNY', 'CUP', 'EUR', 'GBP', 'JPY']) {
      expect(tokenLogoTickerForTicker(ticker)).toBe(ticker)
    }
  })

  it('normalizes casing and trims', () => {
    expect(tokenLogoTickerForTicker(' cup ')).toBe('CUP')
  })

  it('returns undefined for unknown tickers', () => {
    expect(tokenLogoTickerForTicker('XYZ')).toBeUndefined()
  })
})

describe('TokenLogo', () => {
  it('renders the Cuban flag for CUP', () => {
    const { container } = render(<TokenLogo ticker='CUP' />)
    expect(container.querySelector('clipPath#cu-flag-circle')).not.toBeNull()
    expect(container.innerHTML).toContain('#0050A7')
    expect(container.innerHTML).toContain('#D22228')
  })

  it('renders the CubaFlagLogo with blue stripes, red triangle and white star', () => {
    const { container } = render(<CubaFlagLogo />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelectorAll('rect')).toHaveLength(5)
    expect(svg!.querySelector('polygon')).not.toBeNull()
    expect(svg!.querySelector('path')).not.toBeNull()
  })
})
