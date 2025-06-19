export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const crispId = String(config.public.crispWebsiteId)

  const { instance: crisp, onLoaded } = useScriptCrisp({ id: crispId })

  onLoaded(() => {
    crisp?.do('chat:hide')
  })
})
