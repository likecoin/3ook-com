import * as Sentry from '@sentry/nuxt'

const sentryDsn = useRuntimeConfig().public.sentryDsn
if (sentryDsn) {
  Sentry.init({
    // If set up, you can use your runtime config here
    // dsn: useRuntimeConfig().public.sentry.dsn,
    dsn: sentryDsn,

    sendDefaultPii: true,

    // If you don't want to use Session Replay, just remove the line below:
    integrations: [
      Sentry.piniaIntegration(usePinia()),
    ],

    ignoreErrors: [
      '["@context"].toLowerCase',
    ],

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  })
}
