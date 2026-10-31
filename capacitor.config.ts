<<<<<<< HEAD
import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize } from '@capacitor/keyboard'

const config: CapacitorConfig = {
  appId: 'money.arkade.app',
=======
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.delgado74.arkade',
>>>>>>> a7b93bc3 (feat: add Capacitor Android build and APK workflow)
  appName: 'Arkade Wallet',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
<<<<<<< HEAD
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
=======
    Camera: {
      androidPermissions: ['android.permission.CAMERA'],
    },
  },
};

export default config;
>>>>>>> a7b93bc3 (feat: add Capacitor Android build and APK workflow)
