import { Clipboard } from '@capacitor/clipboard'
import { isNativePlatform } from './browser'
import { consoleError } from './logs'

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (isNativePlatform()) {
      await Clipboard.write({ string: text })
      return true
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (err) {
    consoleError(err, 'error writing to clipboard')
  }
  return false
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

export const queryPastePermission = async (): Promise<PermissionState> => {
  try {
    return (await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })).state
  } catch (err) {
    consoleError(err, 'error querying clipboard-read permission')
    return 'prompt'
  }
}
