import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.surftribe.mobile',
  appName: 'SurfTribe',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#4FC6F7'
  }
};

export default config;
