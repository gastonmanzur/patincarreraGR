import api from '../api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

const hasFirebaseConfig = () =>
  Object.values(firebaseConfig).every((value) => typeof value === 'string' && value.trim().length > 0);

const buildServiceWorkerUrl = () => {
  const params = new URLSearchParams(
    Object.entries(firebaseConfig).map(([key, value]) => [key, value?.trim() || ''])
  );
  return `/firebase-messaging-sw.js?${params.toString()}`;
};

const normalizeApiBase = (candidate) => {
  if (!candidate || typeof candidate !== 'string') return '';
  return candidate.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
};

const resolveApiBaseUrl = () =>
  normalizeApiBase(
    import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      api?.defaults?.baseURL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
  );

export const registerWebPushNotifications = async ({ requestPermission = false } = {}) => {
  if (!hasFirebaseConfig() || !vapidKey) return { status: 'missing-config' };

  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.firebase) {
    return { status: 'unsupported' };
  }

  if (Notification.permission === 'default' && requestPermission) {
    await Notification.requestPermission();
  }

  if (Notification.permission !== 'granted') {
    return { status: 'permission-denied' };
  }

  const app =
    window.firebase.apps && window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(firebaseConfig);
  const messaging = window.firebase.messaging(app);
  const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl());

  const token = await messaging.getToken({
    vapidKey,
    serviceWorkerRegistration: registration
  });

  if (token) {
    const apiBaseUrl = resolveApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/device-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionStorage.getItem('token') ? { Authorization: `Bearer ${sessionStorage.getItem('token')}` } : {})
      },
      body: JSON.stringify({
        token,
        plataforma: 'web',
        platform: 'web',
        device: navigator.userAgent
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.mensaje || 'Error registrando token web en backend');
    }

    messaging.onMessage((payload) => {
      console.log('FCM foreground payload:', payload);
    });
  }

  return { status: token ? 'registered' : 'missing-token', token };
};
