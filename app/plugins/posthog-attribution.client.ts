// Persist UTM/click-id attribution as PostHog super-properties so they survive
// the anon → identified transition. With `person_profiles: 'identified_only'`,
// the person profile is only created at $identify, by which time the URL may
// have lost its UTM (e.g. after a Magic Link redirect).

export default defineNuxtPlugin(() => {
  const { onLoaded } = useScriptPostHog()
  const attribution = usePostHogAttribution()
  if (!Object.keys(attribution).length) return

  onLoaded(({ posthog }) => {
    posthog.register(attribution)
    const initialAttribution = Object.fromEntries(
      Object.entries(attribution).map(([key, value]) => [`initial_${key}`, value]),
    )
    posthog.register_once(initialAttribution)
  })
})
