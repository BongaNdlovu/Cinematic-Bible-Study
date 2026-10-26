(function () {
  if (!window.Sentry || typeof window.Sentry.init !== "function") return;

  var host = location.hostname;
  var local = host === "localhost" || host === "127.0.0.1";
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

  var integrations = [window.Sentry.browserTracingIntegration()];
  if (analytics) {
    integrations.push(window.Sentry.replayIntegration());
    integrations.push(window.Sentry.feedbackIntegration({ colorScheme: "system" }));
  }

  window.Sentry.init({
    dsn: "https://54e9edcb7288c4ae47567d746ea7b408@o4512321608679424.ingest.de.sentry.io/4512321648263248",
    release: "shelf@1.0.0",
    environment: local ? "development" : "production",
    integrations: integrations,
    tracesSampleRate: local ? 1 : 0.1,
    tracePropagationTargets: ["localhost", /^https:\/\/cinematic-bible-study-daniel\.pages\.dev/],
    dataCollection: { userInfo: false },
    replaysSessionSampleRate: analytics ? 0.1 : 0,
    replaysOnErrorSampleRate: analytics ? 1 : 0
  });
})();
