import admin from 'firebase-admin';

const getMessaging = () => {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
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
