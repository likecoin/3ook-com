export default defineNuxtPlugin(() => {
  const { isApp } = useAppDetection()

  if (!isApp.value) {
    return
  }

  // Hide Intercom UI elements via CSS in case it loads later
  const styleId = 'intercom-hide-style'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = '#intercom-container, .intercom-lightweight-app, .intercom-namespace { display: none !important; }'
    document.head.appendChild(style)
  }
})
