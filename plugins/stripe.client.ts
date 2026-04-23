export default defineNuxtPlugin(() => {
  const { isApp } = useAppDetection()

  if (isApp.value) {
    return
  }

  useScriptStripe({
    scriptOptions: {
      trigger: 'onNuxtReady',
    },
  })
})
