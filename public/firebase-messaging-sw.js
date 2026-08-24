/* Firebase Cloud Messaging background handler.
 * Service workers can't use ESM/env, so the (public) web config is inlined and
 * the compat SDK is loaded from gstatic. Keep the version in sync with the
 * `firebase` package in package.json. */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
})

const messaging = firebase.messaging()

// Show a notification when a push arrives while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'XpertOne'
  self.registration.showNotification(title, {
    body: payload.notification?.body ?? '',
    icon: '/media/logos/logo.png',
    data: payload.data ?? {},
  })
})
