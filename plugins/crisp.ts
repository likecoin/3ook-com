export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const crispId = config.public.scripts.crisp.id || '5c009125-5863-4059-ba65-43f177ca33f7'

  const crispChatURL = new URL('https://go.crisp.chat/chat/embed')
  crispChatURL.searchParams.set('website_id', crispId)

  const { instance: crisp, onLoaded } = useScriptCrisp({ id: crispId })

  onLoaded(() => {
    crisp?.do('chat:hide')
  })

  return {
    provide: {
      crisp,
      crispChatURL,
    },
  }
})
