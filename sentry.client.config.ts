import * as Sentry from '@sentry/nuxt'
import {
  EPUB_RANGE_LOG_PREFIX,
  WALLET_CONNECT_IDB_TEARDOWN,
} from './app/utils/error-capture-filter'

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
      Sentry.captureConsoleIntegration({ levels: ['error'] }),
    ],

    // Third-party console.error noise captureConsoleIntegration promotes to exceptions;
    // shares the PostHog filter's strings. The object-captured marker is absent by design:
    // ignoreErrors can't see the synthetic flag, and a blanket match would hide real bugs.
    ignoreErrors: [
      '["@context"].toLowerCase',
      WALLET_CONNECT_IDB_TEARDOWN,
      EPUB_RANGE_LOG_PREFIX,
    ],

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  })
}
