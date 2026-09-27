import { Clipboard } from '@capacitor/clipboard'
import { isNativePlatform } from './browser'
import { consoleError } from './logs'

/**
 * Legacy copy path for in-app browsers and embedded webviews where
 * `navigator.clipboard` is missing or rejects writes.
 *
 * The textarea is attached to the DOM briefly (appendChild before
 * removeChild); a MutationObserver registered on document.body fires
 * synchronously while the value is still readable, so callers passing key
 * material (see Backup.tsx mnemonic/nsec copies) accept that exposure on this
 * path. The value is cleared before removal so an observer retaining the node
 * cannot read it later.
 */
const copyViaExecCommand = (text: string): boolean => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)

  const selection = document.getSelection()
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch (err) {
    consoleError(err, 'error using legacy copy fallback')
  }

  if (previousRange) {
    selection?.removeAllRanges()
    selection?.addRange(previousRange)
  }
  textarea.value = ''
  document.body.removeChild(textarea)
  return ok
}

/**
 * Tries each copy mechanism in turn, most reliable first: the Capacitor
 * plugin talks to the Android ClipboardManager directly and is what makes copy
 * work inside the app, the web Clipboard API covers browsers, and
 * `execCommand` is the last resort for webviews that refuse both. Previously
 * the web path returned `false` outright when `navigator.clipboard` was absent
 * or rejected, which left users unable to copy their seed phrase.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (isNativePlatform()) {
    try {
      await Clipboard.write({ string: text })
      return true
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      consoleError(err, 'error writing to clipboard')
    }
  }

  if (copyViaExecCommand(text)) return true
  consoleError(new Error('execCommand("copy") was rejected'), 'error copying via legacy fallback')
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
