// Intercom('onHide') appends listeners and offers no deregister API,
// so we register exactly once per client lifetime.
let hasRegisteredIntercomHide = false

export function useIntercomVisibility() {
  const isIntercomVisible = useState('intercom-visible', () => false)

  function markIntercomVisible() {
    isIntercomVisible.value = true
    if (hasRegisteredIntercomHide) return
    if (!isWebIntercomReady()) return
    window.Intercom('onHide', () => {
      isIntercomVisible.value = false
    })
    hasRegisteredIntercomHide = true
  }

  return {
    isIntercomVisible,
    markIntercomVisible,
  }
}
