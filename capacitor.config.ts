import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize } from '@capacitor/keyboard'

const config: CapacitorConfig = {
  appId: 'money.arkade.app',
  appName: 'Arkade Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Keyboard: {
      // Let the native view resize so `ButtonsOnBottom` and inputs stay above
      // the keyboard, rather than the web view scrolling under it.
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 500,
      backgroundColor: '#101010',
      androidScaleType: 'CENTER_CROP',
    },
  },
}

export default config
