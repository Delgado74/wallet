import { copyToClipboard } from '../lib/clipboard'
import { useToast } from '../components/Toast'
import { useTranslation } from '../providers/language'

export function useCopyToClipboard(): (value: string) => Promise<boolean> {
  const { toast } = useToast()
  const { t } = useTranslation()

  return async (value: string) => {
    try {
      if (await copyToClipboard(value)) {
        toast(t('common.copiedToClipboard'))
        return true
      }
    } catch {
      // fall through to the failure toast
    }
    toast(t('common.failedToCopy'))
    return false
  }
}
