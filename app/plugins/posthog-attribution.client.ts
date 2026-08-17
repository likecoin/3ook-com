// Persist UTM/click-id attribution as PostHog super-properties so they survive
// the anon → identified transition. With `person_profiles: 'identified_only'`,
// the person profile is only created at $identify, by which time the URL may
// have lost its UTM (e.g. after a Magic Link redirect).
// First touch is seeded from the uncollapsed values, so an in-product link tag
// can never claim `initial_utm_*` from a direct or organic visitor.

export default defineNuxtPlugin(() => {
  const { onLoaded } = useScriptPostHog()
  const { lastTouch, externalAttribution, linkTags } = usePostHogAttribution()

  onLoaded(({ posthog }) => {
    // Until Aug 2026 raw `ll_*` were registered as super properties, and
    // posthog-js persists those, so a once-tagged browser keeps stamping a frozen
    // slot. Unregister before the untagged early return — that load needs it most.
    for (const key of POSTHOG_LINK_TAG_KEYS) posthog.unregister(key)

    if (!Object.keys(lastTouch).length) return
    posthog.register(lastTouch)
    posthog.register_once(Object.fromEntries(
      Object.entries({ ...externalAttribution, ...linkTags })
        .map(([key, value]) => [`initial_${key}`, value]),
    ))
  })
})
