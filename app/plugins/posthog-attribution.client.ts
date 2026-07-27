// Persist UTM/click-id attribution as PostHog super-properties so they survive
// the anon → identified transition. With `person_profiles: 'identified_only'`,
// the person profile is only created at $identify, by which time the URL may
// have lost its UTM (e.g. after a Magic Link redirect).
// First touch is seeded from the uncollapsed values, so an in-product link tag
// can never claim `initial_utm_*` from a direct or organic visitor.

export default defineNuxtPlugin(() => {
  const { onLoaded } = useScriptPostHog()
  const { lastTouch, externalAttribution, linkTags } = usePostHogAttribution()
  if (!Object.keys(lastTouch).length) return

  onLoaded(({ posthog }) => {
    posthog.register(lastTouch)
    posthog.register_once(Object.fromEntries(
      Object.entries({ ...externalAttribution, ...linkTags })
        .map(([key, value]) => [`initial_${key}`, value]),
    ))
  })
})
