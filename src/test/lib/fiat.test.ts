import { describe, expect, it, vi } from 'vitest'
import { getPriceFeed } from '../../lib/fiat'
import createFetchMock from 'vitest-fetch-mock'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

describe('fiat utilities', () => {
  it('should fetch fiat values', async () => {
    const expected = {
      eur: 100,
      usd: 200,
      chf: 93,
      cup: 42000000,
    }
    const mockResponse = {
      EUR: { last: expected.eur },
      USD: { last: expected.usd },
      CHF: { last: expected.chf },
    }
    const cupMockResponse = { BTC: { CUP: expected.cup } }
    fetchMocker.mockResponseOnce(JSON.stringify(mockResponse))
    fetchMocker.mockResponseOnce(JSON.stringify(cupMockResponse))
    const result = await getPriceFeed()
    expect(result).toEqual(expected)
  })

  it('keeps the rest of the feed when the CUP quote fails', async () => {
    const mockResponse = {
      EUR: { last: 100 },
      USD: { last: 200 },
      CHF: { last: 93 },
    }
    fetchMocker.mockResponseOnce(JSON.stringify(mockResponse))
    fetchMocker.mockRejectOnce(new Error('yadio down'))
    const result = await getPriceFeed()
    expect(result).toEqual({ eur: 100, usd: 200, chf: 93, cup: undefined })
  })
})
