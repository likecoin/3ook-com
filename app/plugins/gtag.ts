export default defineNuxtPlugin(() => {
  const getRouteQuery = useRouteQuery()
  const { proxy } = useScriptGoogleAnalytics()
  const gaId = useRuntimeConfig().public.scripts.googleAnalytics.id
  const clientId = getRouteQuery('ga_client_id')
  const sessionId = getRouteQuery('ga_session_id')
  if (gaId && (clientId || sessionId)) {
    proxy.gtag('config', gaId, {
      client_id: clientId || undefined,
      session_id: sessionId || undefined,
    })
  }
})
