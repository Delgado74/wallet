import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.canoark.wallet',
  appName: 'CanoArk',
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
