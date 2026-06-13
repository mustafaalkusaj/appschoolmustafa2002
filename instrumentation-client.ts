// This file is used to initialize Sentry on the client side
// It is imported in instrumentation.ts for client-side monitoring

import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  tracesSampleRate: isProduction ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: isProduction ? 0.25 : 1.0,
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
