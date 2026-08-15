import { extractError } from './error'
import { copyToClipboard } from './clipboard'

export function canBrowserShareData(data: any): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false
  if (navigator.canShare) return navigator.canShare(data)
  return true
}

export async function shareData(data: any) {
  if (!canBrowserShareData(data)) {
    await copyToClipboard(data.text ?? '')
    throw 'share_unavailable'
  }
  try {
    await navigator.share(data)
  } catch (err) {
    throw `Error sharing data: ${extractError(err)}`
  }
}
