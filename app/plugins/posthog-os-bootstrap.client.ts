// Seed $initial_os into PostHog flag-eval person properties before the next
// /decide call. With `person_profiles: 'identified_only'`, anonymous visitors
// have no stored person profile, so cohort filters on $initial_os would
// otherwise miss until the first $pageview is ingested and the user is later
// identified.

export default defineNuxtPlugin(() => {
  const { onLoaded } = useScriptPostHog()
  onLoaded(({ posthog }) => {
    const os = posthog.get_property('$initial_os')
    if (typeof os !== 'string' || !os) return
    posthog.setPersonPropertiesForFlags({ $os: os, $initial_os: os })
  })
})
