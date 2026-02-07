import admin from 'firebase-admin';

const resolveFirebaseCredential = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n').trim();

  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  return admin.credential.applicationDefault();
};

const getMessaging = () => {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: resolveFirebaseCredential() });
  }
  return admin.messaging();
};

const coerceData = (data = {}) =>
  Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => typeof value !== 'undefined')
      .map(([key, value]) => [key, String(value)])
  );

export const sendToToken = async ({ token, title, body, data = {} }) => {
  if (!token) return;
  const payload = {
    token,
    notification: {
      title: title ?? '',
      body: body ?? ''
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'patincarrera_general'
      }
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        icon: '/patincarrera-favicon.svg'
      }
    }
  };
  const cleanedData = coerceData(data);
  if (Object.keys(cleanedData).length > 0) {
    payload.data = cleanedData;
  }
  await getMessaging().send(payload);
};

export const sendToTopic = async ({ topic, title, body, data = {} }) => {
  if (!topic) return;
  const payload = {
    topic,
    notification: {
      title: title ?? '',
      body: body ?? ''
    }
  };
  const cleanedData = coerceData(data);
  if (Object.keys(cleanedData).length > 0) {
    payload.data = cleanedData;
  }
  await getMessaging().send(payload);
};
