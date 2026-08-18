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
  // On native platforms the Capacitor Clipboard plugin reads from the OS
  // clipboard directly (Android ClipboardManager) and does not go through
  // the web Permissions API. navigator.permissions can return 'denied' in a
  // Capacitor WebView, which would silently block the paste.
  if (isNativePlatform()) return 'prompt'
  try {
    return (await navigator.permissions.query({ name: 'clipboard-read' as PermissionName })).state
  } catch (err) {
    // Safari and Firefox land here because 'clipboard-read' is unsupported in query()
    consoleError(err, 'error querying clipboard-read permission')
    // we assume 'prompt' status and proceed directly
    return 'prompt'
  }
}
