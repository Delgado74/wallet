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

export const queryPastePermission = async (): Promise<PermissionState> => {
  try {
    // Chrome and Edge will handle this perfectly
    return (await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })).state
  } catch (err) {
    // Safari and Firefox land here because 'clipboard-read' is unsupported in query()
    consoleError(err, 'error querying clipboard-read permission')
    // we assume 'prompt' status and proceed directly
    return 'prompt'
  }
}
