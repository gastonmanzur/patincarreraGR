/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'TU_WEB_API_KEY',
  authDomain: 'TU_AUTH_DOMAIN',
  projectId: 'patincarreragr-788d3',
  storageBucket: 'patincarreragr-788d3.firebasestorage.app',
  messagingSenderId: '282799184125',
  appId: 'TU_WEB_APP_ID'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'Patín Carrera';
  const options = {
    body: payload?.notification?.body || '',
    icon: '/patincarrera-favicon.svg',
    badge: '/patincarrera-favicon.svg',
    data: payload?.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification?.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(self.clients.openWindow(targetUrl));
});
