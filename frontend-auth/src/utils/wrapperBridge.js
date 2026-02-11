export function notifyWrapperLogin({ userId, jwt }) {
  if (!userId) return;

  if (window.PatinBridge && typeof window.PatinBridge.postMessage === 'function') {
    window.PatinBridge.postMessage(
      JSON.stringify({
        type: 'LOGIN',
        userId,
        jwt,
      }),
    );
  }
}
