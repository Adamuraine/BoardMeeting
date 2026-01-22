import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.boardmeeting.mobile',
  appName: 'Board Meeting',
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
