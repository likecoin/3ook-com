import {
  AllAppleDeviceNames,
  combinePresetAndAppleSplashScreens,
  defineConfig,
} from '@vite-pwa/assets-generator/config'

const resizeOptions = {
  background: '#131313',
}

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: combinePresetAndAppleSplashScreens(
    {
      transparent: {
        sizes: [64, 192, 512],
        favicons: [[48, 'favicon.ico']],
        padding: 0,
      },
      maskable: {
        sizes: [200, 512, 1024],
        resizeOptions,
      },
      apple: {
        sizes: [180],
        resizeOptions,
      },
    },
    {
      padding: 0.8,
      resizeOptions: { background: '#f9f9f9', fit: 'contain' },
      darkResizeOptions: { ...resizeOptions, fit: 'contain' },
    },
    AllAppleDeviceNames,
  ),
  images: [process.env.IS_TESTNET ? 'public/logo-testnet.svg' : 'public/logo.svg'],
})
