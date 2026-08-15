import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import Content from './Content'
import ErrorMessage from './Error'
import Header from './Header'
import Padded from './Padded'
import { QRCanvas, frameLoop, frontalCamera } from 'qr/dom.js'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { extractError } from '../lib/error'
import { cameraErrorText, queryCameraPermission } from '../lib/camera'
import QrScanner from 'qr-scanner'
import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { useTranslation } from '../providers/language'

const videoStyle: React.CSSProperties = {
  borderRadius: '0.5rem',
  margin: '0 auto',
}

interface ScannerProps {
  close: () => void
  label: string
  onData: (arg0: string) => void
  onError: (arg0: string) => void
  onSwitch?: () => void
  calculateScanRegion?: (v: HTMLVideoElement) => QrScanner.ScanRegion
}

export default function Scanner(props: ScannerProps) {
  const [currentImplementation, setCurrentImplementation] = useState<'qr' | 'qrmini' | 'mills'>('qr')

  if (Capacitor.isNativePlatform()) {
    return <ScannerNative onData={props.onData} onClose={props.close} onError={props.onError} />
  }

  const handleSwitch = () => {
    setCurrentImplementation(
      currentImplementation === 'qr' ? 'qrmini' : currentImplementation === 'qrmini' ? 'mills' : 'qr',
    )
  }

  return currentImplementation === 'qr' ? (
    <ScannerQr
      close={props.close}
      label={props.label}
      onData={props.onData}
      onError={props.onError}
      onSwitch={handleSwitch}
    />
  ) : currentImplementation === 'qrmini' ? (
    <ScannerQrMini
      close={props.close}
      label={props.label}
      onData={props.onData}
      onError={props.onError}
      onSwitch={handleSwitch}
    />
  ) : (
    <ScannerMills
      close={props.close}
      label={props.label}
      onData={props.onData}
      onError={props.onError}
      onSwitch={handleSwitch}
    />
  )
}

function ScannerNative({
  onData,
  onClose,
  onError,
}: {
  onData: (s: string) => void
  onClose: () => void
  onError: (s: string) => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    const stop = async () => {
      try {
        await BarcodeScanner.stopScan()
      } catch {
        /* ignore */
      }
      try {
        await BarcodeScanner.removeAllListeners()
      } catch {
        /* ignore */
      }
    }

    const start = async () => {
      setBusy(true)
      setError('')
      try {
        const { supported } = await BarcodeScanner.isSupported()
        if (cancelled) return
        if (!supported) {
          setError(t('scanner.unsupported'))
          setBusy(false)
          return
        }

        const perm = await BarcodeScanner.requestPermissions()
        if (cancelled) return
        if (perm.camera === 'denied' || perm.camera === 'prompt') {
          setError(t('scanner.permissionDenied'))
          setBusy(false)
          return
        }

        await BarcodeScanner.addListener('barcodeScanned', (result) => {
          if (cancelled) return
          const raw = result.barcode?.rawValue
          if (raw) {
            cancelled = true
            stop()
            onData(raw)
          }
        })

        await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] })
        if (!cancelled) setBusy(false)
      } catch (err) {
        if (cancelled) return
        const msg = (err as Error)?.message || ''
        if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('user')) {
          cancelled = true
          stop()
          onClose()
        } else {
          setError(t('scanner.cameraError'))
          onError(t('scanner.cameraError'))
          setBusy(false)
        }
      }
    }

    document.body.classList.add('scanner-active')
    start()

    return () => {
      cancelled = true
      document.body.classList.remove('scanner-active')
      stop()
    }
  }, [attempt])

  const handleRetry = () => {
    setError('')
    onError('')
    setBusy(true)
    setAttempt((n) => n + 1)
  }

  return createPortal(
    <div className='scanner-overlay'>
      {busy && !error ? <p className='scanner-hint'>{t('scanner.pointAtQr')}</p> : null}
      {!busy && error ? <p className='scanner-error'>{error}</p> : null}
      {!busy && error ? (
        <button className='btn btn-primary scanner-retry' onClick={handleRetry}>
          {t('scanner.tryAgain')}
        </button>
      ) : null}
      <button
        className='btn btn-secondary scanner-cancel'
        onClick={() => {
          document.body.classList.remove('scanner-active')
          onClose()
        }}
      >
        {t('common.cancel')}
      </button>
    </div>,
    document.body,
  )
}

function ScannerMills({ close, label, onData, onError, onSwitch }: ScannerProps) {
  const [error, setError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  let camera: any
  let canvas: QRCanvas
  let cancel: () => void

  useEffect(() => {
    const startCameraCapture = async () => {
      if (!videoRef.current) return
      try {
        if (canvas) canvas.clear()
        canvas = new QRCanvas()
        camera = await frontalCamera(videoRef.current)
        const devices = await camera.listDevices()
        await camera.setDevice(devices[devices.length - 1].deviceId)
        cancel = frameLoop(() => {
          const res = camera.readFrame(canvas)
          if (res) {
            onData(res)
            handleClose()
          }
        })
      } catch (e) {
        onError(extractError(e))
        setError(true)
      }
    }
    startCameraCapture()
  }, [videoRef])

  const stopScan = () => {
    if (cancel) cancel()
    if (camera) camera.stop()
  }

  const handleClose = () => {
    stopScan()
    close()
  }

  const handleSwitch = () => {
    stopScan()
    if (onSwitch) onSwitch()
  }

  return (
    <>
      <Header auxFunc={handleSwitch} auxText='M' text={label} back={handleClose} />
      <Content>
        <Padded>
          <ErrorMessage error={error} text='Camera not available' />
          <video style={videoStyle} ref={videoRef} />
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleClose} label='Cancel' />
      </ButtonsOnBottom>
    </>
  )
}

function ScannerQr({ calculateScanRegion, close, label, onData, onError, onSwitch }: ScannerProps) {
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScanner = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (!videoRef.current) return
    qrScanner.current = new QrScanner(
      videoRef.current,
      (result) => {
        onData(result.data)
        handleClose()
      },
      {
        maxScansPerSecond: 100,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        onDecodeError: () => {},
        calculateScanRegion,
      },
    )
    let cancelled = false
    qrScanner.current.start().catch(async () => {
      // qr-scanner throws the same 'Camera not found.' whatever went wrong,
      // so the permission is what tells us if the user blocked the camera
      const text = cameraErrorText(await queryCameraPermission())
      if (cancelled) return
      onError(text)
      setError(text)
    })
    return () => {
      cancelled = true
      stopScan()
    }
  }, [attempt])

  const stopScan = () => {
    qrScanner.current?.destroy()
    qrScanner.current = null
  }

  const handleClose = () => {
    stopScan()
    close()
  }

  // re-prompts if the prompt was only dismissed, and picks up a permission
  // the user has just unblocked in the browser settings
  const handleRetry = () => {
    onError('')
    setError('')
    setAttempt((n) => n + 1)
  }

  const handleSwitch = () => {
    stopScan()
    if (onSwitch) onSwitch()
  }

  return (
    <>
      <Header auxFunc={handleSwitch} auxText={calculateScanRegion ? 'q' : 'Q'} text={label} back={handleClose} />
      <Content>
        <Padded>
          <ErrorMessage error={Boolean(error)} text={error} />
          <div id='video-wrapper'>{error ? null : <video id='qr-scanner' ref={videoRef} style={videoStyle} />}</div>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        {error ? <Button onClick={handleRetry} label='Try again' /> : null}
        <Button onClick={handleClose} label='Cancel' secondary={Boolean(error)} />
      </ButtonsOnBottom>
    </>
  )
}

function ScannerQrMini({ close, label, onData, onError, onSwitch }: ScannerProps) {
  // Make scan region smaller to match better small qr codes
  const calculateScanRegion = (v: HTMLVideoElement): QrScanner.ScanRegion => {
    const smallestDimension = Math.min(v.videoWidth, v.videoHeight)
    const scanRegionSize = Math.round((1 / 4) * smallestDimension)
    let region: QrScanner.ScanRegion = {
      x: Math.round((v.videoWidth - scanRegionSize) / 2),
      y: Math.round((v.videoHeight - scanRegionSize) / 2),
      width: scanRegionSize,
      height: scanRegionSize,
    }
    return region
  }

  return (
    <ScannerQr
      close={close}
      label={label}
      onData={onData}
      onError={onError}
      onSwitch={onSwitch}
      calculateScanRegion={calculateScanRegion}
    />
  )
}
