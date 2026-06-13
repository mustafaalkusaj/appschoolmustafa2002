import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),

  // Performance Monitoring
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Privacy
  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
