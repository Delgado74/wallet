import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'money.arkade.app',
  appName: 'Arkade Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
}

export default config
