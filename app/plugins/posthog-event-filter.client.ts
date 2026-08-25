// Drops localhost traffic and the third-party console.error noise that
// `capture_exceptions: { capture_console_errors: true }` (nuxt.config) promotes
// into $exception events. Predicates live in app/utils/error-capture-filter.ts.

export default defineNuxtPlugin(() => {
  const { onLoaded } = useScriptPostHog()

  onLoaded(({ posthog }) => {
    // Resolved once: before_send runs on every captured event, and the hostname
    // cannot change for the lifetime of the document. Drops every event, not
    // just exceptions — dev sessions should not reach the production project.
    if (getIsLocalhostHostname(window.location.hostname)) {
      posthog.set_config({ before_send: () => null })
      return
    }

    posthog.set_config({
      before_send: (event) => {
        if (!event || event.event !== '$exception') return event

        const exceptions = (event.properties?.$exception_list ?? []) as CapturedException[]
        if (exceptions.length && exceptions.every(getIsIgnoredCapturedException)) return null

        for (const exception of exceptions) {
          if (!exception.value) continue
          exception.value = normalizeCapturedExceptionMessage(exception.value)
        }
        const message = event.properties?.$exception_message
        if (typeof message === 'string') {
          event.properties.$exception_message = normalizeCapturedExceptionMessage(message)
        }
        return event
      },
    })
  })
})
