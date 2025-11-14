const BLUE_DOLLAR_API_URL =
  process.env.BLUE_DOLLAR_API_URL?.trim() || 'https://api.bluelytics.com.ar/v2/latest';

const parseFallbackRate = () => {
  const raw = process.env.BLUE_DOLLAR_BUY_RATE_FALLBACK;
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const FALLBACK_RATE = parseFallbackRate() || 1000;
const FETCH_TIMEOUT_MS = 4000;

const fetchBlueDollarBuyRate = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(BLUE_DOLLAR_API_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Unexpected response ${response.status}`);
    }

    const data = await response.json();
    const rate = Number.parseFloat(
      data?.blue?.value_buy ?? data?.blue?.value_avg ?? data?.oficial?.value_buy
    );
    const lastUpdate = data?.blue?.date || data?.last_update || new Date().toISOString();

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Blue dollar buy rate missing in API response.');
    }

    return {
      rate,
      fetchedAt: new Date(lastUpdate),
      source: 'api',
      isFallback: false
    };
  } catch (error) {
    console.error('Falling back to configured blue dollar buy rate', error);
    return {
      rate: FALLBACK_RATE,
      fetchedAt: new Date(),
      source: 'fallback',
      isFallback: true
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const convertUsdToArsAtBlueRate = async (usdAmount) => {
  const amount = Number.parseFloat(usdAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto en USD debe ser un número válido.');
  }

  const { rate, fetchedAt, source, isFallback } = await fetchBlueDollarBuyRate();
  const arsAmount = Math.round(amount * rate * 100) / 100;

  return {
    usdAmount: amount,
    arsAmount,
    rate,
    fetchedAt,
    source,
    isFallback
  };
};

export { convertUsdToArsAtBlueRate, fetchBlueDollarBuyRate };
