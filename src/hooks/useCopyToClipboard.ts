import { copyToClipboard } from '../lib/clipboard'
import { useToast } from '../components/Toast'
import { useTranslation } from '../providers/language'

export function useCopyToClipboard(): (value: string) => Promise<boolean> {
  const { toast } = useToast()
  const { t } = useTranslation()

  return async (value: string) => {
    let copied = false
    try {
      copied = await copyToClipboard(value)
    } catch {
      copied = false
    }
    if (typeof copied !== 'boolean') copied = !!copied
    toast(copied ? t('common.copiedToClipboard') : t('common.failedToCopy'))
    return copied
  }
}
