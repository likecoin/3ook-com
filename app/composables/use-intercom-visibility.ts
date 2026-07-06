// Intercom('onHide') appends listeners and offers no deregister API,
// so we register exactly once per client lifetime.
let hasRegisteredIntercomHide = false

export function useIntercomVisibility() {
  const isIntercomVisible = useState('intercom-visible', () => false)
  const { isApp } = useAppDetection()
  const intercom = useIntercom()

  function markIntercomVisible() {
    isIntercomVisible.value = true
    if (hasRegisteredIntercomHide) return
    if (!isWebIntercomReady()) return
    window.Intercom('onHide', () => {
      isIntercomVisible.value = false
    })
    hasRegisteredIntercomHide = true
  }

  // Open Intercom with a prefilled message, tracking visibility when it opens
  // as an in-page web chat so the layout can react to it.
  function showNewMessageWithVisibility(message?: string, subject?: string) {
    const result = intercom.showNewMessage(message, subject)
    if (result.method === 'chat' && !isApp.value) {
      markIntercomVisible()
    }
    return result
  }

  return {
    isIntercomVisible,
    markIntercomVisible,
    showNewMessageWithVisibility,
  }
}
