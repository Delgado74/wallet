import { useContext } from 'react'
import { AspContext } from '../providers/asp'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { WalletContext } from '../providers/wallet'
import { defaultFee } from '../lib/constants'
import { buildTransactionAmountDisplay, TransactionAmountDisplay } from '../lib/transactionAmountDisplay'
import { Tx } from '../lib/types'

/** The builder args every call site derives from context the same way. */
export function useAmountDisplayContext() {
  const { config } = useContext(ConfigContext)
  const { fromFiatAmount, toFiatAmount } = useContext(FiatContext)
  const { assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)
  return {
    bitcoinUnit: config.unit,
    currency: config.currency,
    fromFiatAmount,
    isVerifiedAsset,
    metadataForAsset: (assetId: string) => assetMetadataCache.get(assetId)?.metadata,
    network: aspInfo.network,
    toFiatAmount,
  }
}

/** Amount display for an activity tx. Swap rows render their own summary, so they get undefined. */
export function useTransactionAmountDisplay(tx: Tx | undefined): TransactionAmountDisplay | undefined {
  const context = useAmountDisplayContext()
  if (!tx || tx.type === 'swap') return undefined
  // Lightning sends: show the net invoice amount (what the recipient got),
  // not the gross fund amount (which includes the solver fee).
  const satoshis = tx.assets?.length
    ? 0
    : tx.type === 'sent' && tx.lnSend?.invoiceAmount
      ? tx.lnSend.invoiceAmount
      : Math.max(tx.type === 'sent' ? tx.amount - defaultFee : tx.amount, 0)
  return buildTransactionAmountDisplay({
    ...context,
    assets: tx.assets,
    satoshis,
  })
}
