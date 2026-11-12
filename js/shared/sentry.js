(function () {
  if (!window.Sentry || typeof window.Sentry.init !== "function") return;

  var host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost")) return;

  var analytics = false;
  try {
    var dnt = navigator.doNotTrack || window.doNotTrack;
    if (navigator.globalPrivacyControl !== true && dnt !== "1") {
      var raw = localStorage.getItem("sodConsent");
      var rec = raw ? JSON.parse(raw) : null;
      analytics = !!(rec && rec.v === 1 && rec.analytics === true);
    }
  } catch (e) {
    analytics = false;
  }

  var integrations = [];
  if (typeof window.Sentry.browserTracingIntegration === "function") {
    integrations.push(window.Sentry.browserTracingIntegration());
  }
  if (analytics && typeof window.Sentry.feedbackIntegration === "function") {
    integrations.push(window.Sentry.feedbackIntegration({ colorScheme: "system", showName: false, showEmail: false }));
  }

  window.Sentry.init({
    dsn: "https://54e9edcb7288c4ae47567d746ea7b408@o4512321608679424.ingest.de.sentry.io/4512321648263248",
    release: "shelf@1.0.0",
    environment: "production",
    integrations: integrations,
    tracesSampleRate: 0.1,
    tracePropagationTargets: [/^https:\/\/cinematic-bible-study-daniel\.pages\.dev/],
    dataCollection: { userInfo: false },
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  });
})();
