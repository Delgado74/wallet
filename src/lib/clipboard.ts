import { Clipboard } from '@capacitor/clipboard'
import { isNativePlatform } from './browser'
import { consoleError } from './logs'

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    if (isNativePlatform()) {
      await Clipboard.write({ string: text })
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
  } catch (err) {
    consoleError(err, 'error writing to clipboard')
  }
}

export const pasteFromClipboard = async (): Promise<string> => {
  try {
    if (isNativePlatform()) {
      const { value } = await Clipboard.read()
      return value ?? ''
    }
    if (navigator.clipboard) {
      return await navigator.clipboard.readText()
    }
  } catch (err) {
    consoleError(err, 'error pasting from clipboard')
  }
  return ''
}
