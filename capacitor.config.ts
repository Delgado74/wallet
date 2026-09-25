import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.arkade.wallet',
  appName: 'Arkade Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Camera: {
      androidPermissions: ['android.permission.CAMERA'],
    },
  },
}

export default config
