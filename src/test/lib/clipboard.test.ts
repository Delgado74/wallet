import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clipboard } from '@capacitor/clipboard'
import { copyToClipboard } from '../../lib/clipboard'

// The plugin's web implementation registers itself lazily, so the real proxy
// has no `write` to spy on outside a native runtime.
vi.mock('@capacitor/clipboard', () => ({
  Clipboard: { write: vi.fn(), read: vi.fn() },
}))

const writeMock = vi.mocked(Clipboard.write)

const setExecCommand = (impl: () => boolean) => {
  Object.defineProperty(document, 'execCommand', { value: impl, configurable: true })
}

beforeEach(() => {
  setExecCommand(() => false)
  delete (window as any).Capacitor
  writeMock.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(document, 'execCommand')
  delete (window as any).Capacitor
  vi.restoreAllMocks()
})

describe('copyToClipboard', () => {
  it('uses the Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    await expect(copyToClipboard('nsec1secret')).resolves.toBe(true)

    expect(writeText).toHaveBeenCalledWith('nsec1secret')
  })

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    let textareaVisibleDuringCall = false
    const execCommand = vi.fn(() => {
      textareaVisibleDuringCall = document.querySelector('textarea') !== null
      return true
    })
    setExecCommand(execCommand)

    await expect(copyToClipboard('hello')).resolves.toBe(true)

    expect(textareaVisibleDuringCall).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('clears the fallback textarea value before removing it', async () => {
    const removeChild = vi.spyOn(document.body, 'removeChild')
    setExecCommand(() => true)

    await copyToClipboard('nsec1secret')

    const [removed] = removeChild.mock.calls[0]
    const textarea = removed as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })

  it('falls back to execCommand when writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const execCommand = vi.fn(() => true)
    setExecCommand(execCommand)

    await expect(copyToClipboard('hello')).resolves.toBe(true)

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('logs the legacy failure and resolves to false when every path fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(copyToClipboard('hello')).resolves.toBe(false)

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const [message] = consoleErrorSpy.mock.calls[0]
    expect(String(message)).toContain('error copying via legacy fallback')
    expect(String(message)).toContain('rejected')
  })

  it('prefers the native plugin on a native platform and never touches the DOM', async () => {
    ;(window as any).Capacitor = { isNativePlatform: () => true }
    writeMock.mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const execCommand = vi.fn(() => true)
    setExecCommand(execCommand)

    await expect(copyToClipboard('nsec1secret')).resolves.toBe(true)

    expect(writeMock).toHaveBeenCalledWith({ string: 'nsec1secret' })
    expect(writeText).not.toHaveBeenCalled()
    expect(execCommand).not.toHaveBeenCalled()
  })

  it('still falls back when the native plugin rejects', async () => {
    ;(window as any).Capacitor = { isNativePlatform: () => true }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    writeMock.mockRejectedValue(new Error('no clipboard service'))
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const execCommand = vi.fn(() => true)
    setExecCommand(execCommand)

    await expect(copyToClipboard('nsec1secret')).resolves.toBe(true)

    expect(execCommand).toHaveBeenCalledWith('copy')
  })
})
