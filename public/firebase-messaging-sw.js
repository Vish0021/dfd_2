/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker
// This file must live at the root of /public so it is served at /firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Initialize Firebase inside the SW using the same project config.
// These are non-secret identifiers (same values used in the client bundle).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    const config = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? "DFD";
      const options = {
        body: payload.notification?.body ?? "",
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        data: payload.data ?? {},
      };
      self.registration.showNotification(title, options);
    });
  }
});

// Handle notification click — open or focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
