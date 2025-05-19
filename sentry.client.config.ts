import * as Sentry from '@sentry/nuxt'

if (process.env.NODE_ENV !== 'development') {
  Sentry.init({
    // If set up, you can use your runtime config here
    // dsn: useRuntimeConfig().public.sentry.dsn,
    dsn: 'https://07b4bd03c1d828f7e241ccc9e47a2f80@o149940.ingest.us.sentry.io/4509350693240832',

    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.0,

    // If the entire session is not sampled, use the below sample rate to sample
    // sessions when an error occurs.
    replaysOnErrorSampleRate: 1.0,

    // If you don't want to use Session Replay, just remove the line below:
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  })
}
