interface EventParams {
  [key: string]: unknown
}

export default function useLogEvent(eventName: string, eventParams?: EventParams) {
  const { instance: crisp } = useScriptCrisp()
  try {
    useTrackEvent(eventName, eventParams)
  }
  catch {
    console.error(`Failed to track event: ${eventName}`, eventParams)
  }
  if (crisp) {
    try {
      const { items, ...params } = eventParams || {}
      if (items) {
        params.items = JSON.stringify(items)
      }
      crisp.set('session:event', [[[eventName, params]]])
    }
    catch (error) {
      console.error(`Failed to log event to Crisp: ${eventName}`, error)
    }
  }
}
