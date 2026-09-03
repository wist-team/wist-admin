import type { ConfigContext, ExpoConfig } from 'expo/config';

// Base: Jon Hall's shipped config for build 26 (recovered/build26/app.config.json).
// Changes from that file are commented; everything else is verbatim.
const EAS_PROJECT_ID = '346028dc-64f8-4f99-8c45-8b64faf30466';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Wist Admin', // was "SyftAdmin"; matches the TestFlight app name
  slug: 'SyftAdmin', // must stay: identifies the EAS project
  owner: 'jonmhall',
  version: '1.1.0', // was 1.0.0
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  assetBundlePatterns: ['**/*'],
  // Was { policy: "appVersion" }. Fingerprint means any native change produces a
  // new runtime version, so an OTA update can never reach an incompatible binary.
  runtimeVersion: { policy: 'fingerprint' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  ios: {
    supportsTablet: true,
    buildNumber: '27', // was 26
    bundleIdentifier: 'site.syft.admin.v2', // App Store Connect record; never change
    infoPlist: {
      NSUserActivityTypes: ['INSendMessageIntent'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'site.syft.admin',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#282728',
    },
  },
  web: { favicon: './assets/favicon.png' },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
  plugins: [
    'expo-font',
    'expo-asset',
    [
      'expo-splash-screen',
      { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#282728' },
    ],
    'expo-status-bar',
  ],
});
