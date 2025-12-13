import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const FALLBACK_TRIAL_DAYS = 30;

const FALLBACK_PLANS = [
  {
    id: 'starter',
    name: 'Club Inicial',
    description: 'Ideal para clubes que están comenzando su recorrido competitivo.',
    monthlyPrice: 10,
    baseMonthlyPrice: 10,
    currency: 'USD',
    baseCurrency: 'USD',
    billingCurrency: 'ARS',
    minAthletes: 0,
    maxAthletes: 15,
    headline: 'Hasta 15 patinadores',
    badge: 'Comenzá hoy',
    features: [
      'Gestión completa de delegados, técnicos y deportistas',
      'Carga de hasta 15 patinadores con seguimiento integral',
      'Reportes esenciales para torneos y entrenamientos'
    ]
  },
  {
    id: 'growth',
    name: 'Club en Expansión',
    description: 'Pensado para clubes que suman nuevos deportistas y equipos.',
    monthlyPrice: 15,
    baseMonthlyPrice: 15,
    currency: 'USD',
    baseCurrency: 'USD',
    billingCurrency: 'ARS',
    minAthletes: 16,
    maxAthletes: 30,
    headline: '16 a 30 patinadores',
    badge: 'Más elegido',
    features: [
      'Todas las herramientas del plan Inicial',
      'Análisis comparativo del rendimiento por deportista',
      'Exportaciones en Excel y control avanzado de cupos'
    ]
  },
  {
    id: 'elite',
    name: 'Club Elite',
    description: 'Para instituciones consolidadas con planteles grandes.',
    monthlyPrice: 20,
    baseMonthlyPrice: 20,
    currency: 'USD',
    baseCurrency: 'USD',
    billingCurrency: 'ARS',
    minAthletes: 31,
    maxAthletes: null,
    headline: 'Más de 30 patinadores',
    badge: 'Máxima capacidad',
    features: [
      'Todo lo de los planes anteriores',
      'Capacitación y soporte prioritario para el staff',
      'Capacidad extendida sin límites tecnológicos'
    ]
  }
];

const formatCurrency = (price, currency = 'USD') => {
  if (typeof price !== 'number') return '—';
  const isArs = currency === 'ARS';

  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: isArs ? 2 : 0,
      minimumFractionDigits: isArs ? 2 : 0
    }).format(price);
  } catch {
    const fallbackValue = isArs ? price.toFixed(2) : Math.round(price).toString();
    return `${currency} ${fallbackValue}`;
  }
};

const buildAthleteRangeLabel = (plan) => {
  const min = typeof plan?.minAthletes === 'number' ? plan.minAthletes : null;
  const max = typeof plan?.maxAthletes === 'number' ? plan.maxAthletes : null;

  if (min !== null && max !== null) {
    if (min <= 0) {
      return `Hasta ${max} patinadores`;
    }
    return `${min} a ${max} patinadores`;
  }

  if (max !== null) {
    return `Hasta ${max} patinadores`;
  }

  if (min !== null && min > 1) {
    return `Más de ${min - 1} patinadores`;
  }

  return 'Cupo flexible de patinadores';
};

const ensureFeatures = (planFeatures, trialDays) => {
  const features = Array.isArray(planFeatures) ? [...planFeatures] : [];
  if (trialDays) {
    const trialMessage = `Período de prueba gratis de ${trialDays} días`;
    const alreadyIncludesTrial = features.some((feature) =>
      typeof feature === 'string' && feature.toLowerCase().includes('prueba')
    );
    if (!alreadyIncludesTrial) {
      features.unshift(trialMessage);
    }
  }
  return features;
};

const normaliseDigits = (value) => (value || '').toString().replace(/\D+/g, '');

const luhnCheck = (value) => {
  const digits = normaliseDigits(value);
  if (!digits) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number.parseInt(digits.charAt(i), 10);
    if (!Number.isFinite(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const buildSavedMethodLabel = (method) => {
  if (!method) return '';
  const brand = method.brand || 'Tarjeta';
  const last4 = method.last4 || '****';
  const month = method.expiryMonth ? String(method.expiryMonth).padStart(2, '0') : '--';
  const year = method.expiryYear ? String(method.expiryYear).slice(-2) : '--';
  return `${brand} terminada en ${last4} (venc. ${month}/${year})`;
};

const formatBlueRateTimestamp = (value) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch {
    return '';
  }
};

const getBaseCurrency = (plan) => plan?.baseCurrency || plan?.currency || 'USD';
const getBaseMonthlyPrice = (plan) =>
  typeof plan?.baseMonthlyPrice === 'number' ? plan.baseMonthlyPrice : plan?.monthlyPrice;
const getBillingCurrency = (plan) => plan?.billingCurrency || 'ARS';

export default function Suscripciones() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [trialDays, setTrialDays] = useState(FALLBACK_TRIAL_DAYS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethodType, setPaymentMethodType] = useState('card');
  const [mercadoPagoAvailable, setMercadoPagoAvailable] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [cardForm, setCardForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: ''
  });
  const [cardErrors, setCardErrors] = useState({});
  const [savingMethod, setSavingMethod] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [checkoutResult, setCheckoutResult] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await api.get('/public/subscription-plans');
        if (!active) return;

        const payload = res.data || {};
        const fetchedPlans = Array.isArray(payload.plans) ? payload.plans : [];

        if (typeof payload.trialDays === 'number' && payload.trialDays >= 0) {
          setTrialDays(payload.trialDays);
        }

        if (fetchedPlans.length > 0) {
          setPlans(fetchedPlans);
          setError('');
        } else {
          setPlans(FALLBACK_PLANS);
        }
      } catch (err) {
        if (!active) return;
        console.error('Error al cargar planes de suscripción', err);
        setError('No pudimos cargar los planes actualizados. Mostramos los valores de referencia.');
        setPlans(FALLBACK_PLANS);
        setTrialDays(FALLBACK_TRIAL_DAYS);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPlans();

    return () => {
      active = false;
    };
  }, []);

  const plansWithFeatures = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        features: ensureFeatures(plan.features, trialDays)
      })),
    [plans, trialDays]
  );

  useEffect(() => {
    if (paymentMethodType !== 'card') return;
    if (!paymentMethods.length) {
      setSelectedMethodId('');
      return;
    }

    setSelectedMethodId((current) => {
      if (current && paymentMethods.some((method) => method.id === current)) {
        return current;
      }
      return paymentMethods[0]?.id ?? '';
    });
  }, [paymentMethods, paymentMethodType]);

  const resetMessages = () => {
    setInfoMessage('');
    setErrorMessage('');
  };

  useEffect(() => {
    let active = true;

    const fetchPaymentAvailability = async () => {
      try {
        const res = await api.get('/subscriptions/status');
        if (!active) return;
        setMercadoPagoAvailable(Boolean(res.data?.mercadoPagoAvailable));
      } catch (err) {
        if (!active) return;
        console.error('Error al verificar disponibilidad de pagos', err);
        setMercadoPagoAvailable(true);
      }
    };

    fetchPaymentAvailability();

    return () => {
      active = false;
    };
  }, []);

  const loadPaymentMethods = async () => {
    setMethodsLoading(true);
    try {
      const res = await api.get('/payments/methods');
      const list = Array.isArray(res.data?.methods) ? res.data.methods : [];
      setPaymentMethods(list);
      setErrorMessage('');
    } catch (err) {
      console.error('Error al obtener métodos de pago guardados', err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setErrorMessage('Debes iniciar sesión con tu cuenta de delegado para gestionar los pagos.');
      } else {
        setErrorMessage('No pudimos cargar tus métodos de pago guardados. Podés registrar uno nuevo.');
      }
      setPaymentMethods([]);
    } finally {
      setMethodsLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan({ ...plan });
    setPaymentMethodType('card');
    setCheckoutResult(null);
    setSelectedMethodId('');
    setCardForm({ cardholderName: '', cardNumber: '', expiryMonth: '', expiryYear: '' });
    setCardErrors({});
    resetMessages();
    loadPaymentMethods();
  };

  const handlePaymentMethodTypeChange = (event) => {
    const value = event.target.value;
    if (value === 'mercadopago' && !mercadoPagoAvailable) {
      setErrorMessage('Mercado Pago no está disponible en este momento. Elegí una tarjeta guardada para continuar.');
      setPaymentMethodType('card');
      return;
    }
    setPaymentMethodType(value);
    setCheckoutResult(null);
    resetMessages();
    if (value !== 'card') {
      setSelectedMethodId('');
    }
  };

  const handleCardInputChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'cardNumber') {
      nextValue = value.replace(/[^0-9\s]/g, '');
    }

    if (name === 'expiryMonth' || name === 'expiryYear') {
      const limit = name === 'expiryMonth' ? 2 : 4;
      nextValue = value.replace(/\D/g, '').slice(0, limit);
    }

    setCardForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const validateCardForm = () => {
    const errors = {};
    const digits = normaliseDigits(cardForm.cardNumber);
    const month = Number.parseInt(cardForm.expiryMonth, 10);
    const rawYear = Number.parseInt(cardForm.expiryYear, 10);
    const holder = cardForm.cardholderName.trim();

    if (!holder) {
      errors.cardholderName = 'Ingresá el titular tal como figura en la tarjeta.';
    }

    if (!digits || digits.length < 12 || digits.length > 19) {
      errors.cardNumber = 'Ingresá un número de tarjeta válido.';
    } else if (!luhnCheck(digits)) {
      errors.cardNumber = 'El número de tarjeta no supera la validación de seguridad.';
    }

    if (!Number.isFinite(month) || month < 1 || month > 12) {
      errors.expiryMonth = 'Ingresá un mes válido (01 a 12).';
    }

    if (!Number.isFinite(rawYear)) {
      errors.expiryYear = 'Ingresá un año válido.';
    }

    const current = new Date();
    const currentYear = current.getFullYear();
    const currentMonth = current.getMonth() + 1;
    const fullYear = Number.isFinite(rawYear) ? (rawYear < 100 ? 2000 + rawYear : rawYear) : null;

    if (!errors.expiryMonth && !errors.expiryYear) {
      if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
        errors.expiryMonth = 'La tarjeta ingresada se encuentra vencida.';
      }
    }

    setCardErrors(errors);

    if (Object.keys(errors).length > 0) {
      return null;
    }

    return {
      cardholderName: holder,
      cardNumber: digits,
      expiryMonth: month,
      expiryYear: fullYear
    };
  };

  const handleCardSubmit = async (event) => {
    if (event) {
      event.preventDefault();
    }
    resetMessages();
    const validated = validateCardForm();
    if (!validated) return;

    setSavingMethod(true);
    try {
      const res = await api.post('/payments/methods', {
        cardholderName: validated.cardholderName,
        cardNumber: validated.cardNumber,
        expiryMonth: validated.expiryMonth,
        expiryYear: validated.expiryYear
      });

      const savedMethod = res.data?.method;
      if (savedMethod) {
        setPaymentMethods((prev) => {
          const filtered = prev.filter((method) => method.id !== savedMethod.id);
          return [savedMethod, ...filtered];
        });
        setSelectedMethodId(savedMethod.id);
      }

      setCardForm({ cardholderName: '', cardNumber: '', expiryMonth: '', expiryYear: '' });
      setCardErrors({});
      setInfoMessage(res.data?.mensaje || 'Método de pago guardado correctamente.');
    } catch (err) {
      console.error('Error al guardar método de pago', err);
      const message = err?.response?.data?.mensaje || 'No se pudo guardar el método de pago. Intentá nuevamente.';
      setErrorMessage(message);
    } finally {
      setSavingMethod(false);
    }
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (!selectedPlan) return;

    resetMessages();
    setCheckoutResult(null);

    if (paymentMethodType === 'card' && !selectedMethodId) {
      setCardErrors((prev) => ({ ...prev, general: 'Seleccioná una tarjeta guardada.' }));
      setErrorMessage('Seleccioná una tarjeta guardada para continuar.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const payload = {
        planId: selectedPlan.id,
        paymentMethodType
      };

      if (paymentMethodType === 'card') {
        payload.paymentMethodId = selectedMethodId;
      }

      const res = await api.post('/subscriptions/checkout', payload);
      setCheckoutResult(res.data || null);
      if (res.data?.mensaje) {
        setInfoMessage(res.data.mensaje);
      }
    } catch (err) {
      console.error('Error al preparar el cobro de la suscripción', err);
      const message =
        err?.response?.data?.mensaje || 'No pudimos preparar el cobro. Verificá los datos e intentá nuevamente.';
      setErrorMessage(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenMercadoPago = () => {
    if (!checkoutResult?.redirectUrl) return;
    if (typeof window !== 'undefined') {
      window.open(checkoutResult.redirectUrl, '_blank', 'noopener');
    }
  };

  const renderCheckoutSummary = () => {
    if (!checkoutResult?.payment) return null;

    if (checkoutResult.payment.type === 'card') {
      const amount = checkoutResult.payment.amount || {};
      const chargeAmount = formatCurrency(amount.total, amount.currency || getBillingCurrency(selectedPlan));
      const baseAmount = formatCurrency(
        amount.baseTotal ?? getBaseMonthlyPrice(selectedPlan),
        amount.baseCurrency || getBaseCurrency(selectedPlan)
      );
      const rate = amount.blueDollarRate;
      const rateTimestamp = formatBlueRateTimestamp(amount.fetchedAt);

      return (
        <div className="alert alert-success mt-4" role="alert">
          <h4 className="h6 text-uppercase mb-2">Tarjeta validada</h4>
          <p className="mb-1">
            Se utilizará {buildSavedMethodLabel(checkoutResult.payment.method)} para abonar{' '}
            {chargeAmount} cada mes (equivalente a {baseAmount}{' '}
            {rate ? `al dólar blue compra $${rate?.toFixed?.(2) ?? Number(rate).toFixed(2)}` : ''}).
          </p>
          {rateTimestamp && <p className="mb-1 text-muted">Cotización tomada el {rateTimestamp}.</p>}
          <p className="mb-0 text-muted">Los datos sensibles están cifrados con estándares de grado bancario.</p>
        </div>
      );
    }

    if (checkoutResult.payment.type === 'mercadopago') {
      const amountArs = formatCurrency(checkoutResult.payment.amountArs, 'ARS');
      const rate = checkoutResult.payment.blueDollarRate;
      const rateTimestamp = formatBlueRateTimestamp(checkoutResult.payment.fetchedAt);
      const baseAmount = formatCurrency(
        checkoutResult.payment.usdAmount || getBaseMonthlyPrice(selectedPlan),
        getBaseCurrency(selectedPlan)
      );

      return (
        <div className="alert alert-info mt-4" role="alert">
          <h4 className="h6 text-uppercase mb-2">Pago vía Mercado Pago</h4>
          <p className="mb-1">
            Serás redirigido a Mercado Pago para abonar {amountArs} (equivalente a {baseAmount}{' '}
            al dólar blue compra ${rate?.toFixed?.(2) ?? Number(rate).toFixed(2)}).
          </p>
          {rateTimestamp && (
            <p className="mb-1 text-muted">Cotización tomada el {rateTimestamp}.</p>
          )}
          <button type="button" className="btn btn-primary mt-2" onClick={handleOpenMercadoPago}>
            Ir a Mercado Pago
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-6 fw-bold text-uppercase">Planes de suscripción para clubes</h1>
        <p className="lead text-muted">
          Elegí la capacidad de patinadores que mejor se adapte a tu institución y activá todas las funciones de la
          plataforma.
        </p>
        {trialDays > 0 && (
          <div className="alert alert-success d-inline-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-gift-fill" aria-hidden="true"></i>
            <span>Período de prueba gratis de {trialDays} días para cada club.</span>
          </div>
        )}
        {loading && (
          <div className="d-flex justify-content-center align-items-center gap-2 mt-3 text-primary">
            <div className="spinner-border" role="status" aria-hidden="true"></div>
            <span>Cargando planes...</span>
          </div>
        )}
        {error && !loading && (
          <div className="alert alert-warning mt-3" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="row g-4">
        {plansWithFeatures.map((plan) => (
          <div className="col-12 col-md-6 col-lg-4" key={plan.id}>
            <div className={`card subscription-card h-100 ${plan.badge ? 'border-primary shadow-lg' : ''}`}>
              <div className="card-body d-flex flex-column">
                {plan.badge && (
                  <span className="badge bg-primary-subtle text-primary-emphasis mb-3 align-self-start">
                    {plan.badge}
                  </span>
                )}
                <h2 className="h4 text-uppercase">{plan.name}</h2>
                <p className="text-muted small mb-3">{plan.description}</p>
                <div className="mb-3">
                  <div className="text-muted text-uppercase small">Precio mensual</div>
                  <div className="display-6 fw-bold text-primary">
                    {formatCurrency(getBaseMonthlyPrice(plan), getBaseCurrency(plan))}
                  </div>
                  <p className="text-muted mb-1">{buildAthleteRangeLabel(plan)}</p>
                  <p className="text-muted small mb-0">
                    Cobro en {getBillingCurrency(plan)} al equivalente mensual en dólares del plan.
                  </p>
                </div>
                <ul className="list-unstyled flex-grow-1">
                  {plan.features.map((feature, index) => (
                    <li className="d-flex align-items-start mb-2" key={`${plan.id}-${index}`}>
                      <i className="bi bi-check-circle-fill text-success me-2" aria-hidden="true"></i>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-primary w-100 mt-auto"
                  onClick={() => handleSelectPlan(plan)}
                >
                  Elegir este plan
                </button>
                <a
                  className="btn btn-link w-100 mt-2 text-decoration-none"
                  href="mailto:patincarreragr25@gmail.com?subject=Consulta%20planes%20Pat%C3%ADn%20Carrera"
                >
                  Consultar con un asesor
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div className="mt-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4 p-md-5">
              <h2 className="h4 text-uppercase text-primary mb-3">Activá tu suscripción de forma segura</h2>
              <p className="text-muted mb-4">
                Estás a un paso de habilitar todas las funciones del plan {selectedPlan.name}. Elegí el método de pago que
                prefieras. Los datos sensibles se cifran con AES-256 y nunca almacenamos el código de seguridad de tu
                tarjeta.
              </p>

              <div className="bg-light rounded-4 p-3 p-md-4 mb-4">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
                  <div>
                    <span className="text-muted text-uppercase small">Plan seleccionado</span>
                    <h3 className="h5 mb-1">{selectedPlan.name}</h3>
                    <p className="mb-0 text-muted">{buildAthleteRangeLabel(selectedPlan)}</p>
                  </div>
                  <div className="text-md-end">
                    <span className="text-muted text-uppercase small">Cuota mensual</span>
                    <div className="display-6 fw-bold text-primary">
                      {formatCurrency(getBaseMonthlyPrice(selectedPlan), getBaseCurrency(selectedPlan))}
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCheckout}>
                <fieldset>
                  <legend className="h6 text-uppercase text-primary">Elegí cómo querés pagar</legend>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="paymentMethodType"
                      id="payment-method-card"
                      value="card"
                      checked={paymentMethodType === 'card'}
                      onChange={handlePaymentMethodTypeChange}
                    />
                    <label className="form-check-label" htmlFor="payment-method-card">
                      Tarjeta de crédito o débito (procesamiento cifrado)
                    </label>
                  </div>
                  <div className="form-check mb-4">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="paymentMethodType"
                      id="payment-method-mercado-pago"
                      value="mercadopago"
                      checked={paymentMethodType === 'mercadopago'}
                      disabled={!mercadoPagoAvailable}
                      onChange={handlePaymentMethodTypeChange}
                    />
                    <label className="form-check-label" htmlFor="payment-method-mercado-pago">
                      Mercado Pago (convertimos a ARS al dólar blue compra al momento del pago)
                    </label>
                  </div>
                  {!mercadoPagoAvailable && (
                    <p className="text-muted small mb-4">
                      Mercado Pago no está disponible en este momento. Podés continuar con una tarjeta guardada o
                      agregar una nueva para activar tu suscripción.
                    </p>
                  )}
                </fieldset>

                {paymentMethodType === 'card' && (
                  <div className="border rounded-4 p-3 p-md-4 bg-white">
                    <h3 className="h6 text-uppercase mb-3">Tarjetas guardadas</h3>
                    {methodsLoading && (
                      <div className="d-flex align-items-center gap-2 text-primary mb-3">
                        <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                        <span>Cargando métodos guardados...</span>
                      </div>
                    )}
                    {!methodsLoading && paymentMethods.length === 0 && (
                      <p className="text-muted mb-3">Todavía no guardaste tarjetas. Podés sumar una nueva a continuación.</p>
                    )}
                    {paymentMethods.map((method) => (
                      <div className="form-check mb-2" key={method.id}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="savedPaymentMethod"
                          id={`payment-${method.id}`}
                          value={method.id}
                          checked={selectedMethodId === method.id}
                          onChange={() => setSelectedMethodId(method.id)}
                        />
                        <label className="form-check-label" htmlFor={`payment-${method.id}`}>
                          {buildSavedMethodLabel(method)}
                        </label>
                      </div>
                    ))}
                    {cardErrors.general && (
                      <div className="text-danger small mb-3">{cardErrors.general}</div>
                    )}

                    <div className="mt-4 pt-4 border-top">
                      <h4 className="h6 text-uppercase mb-3">Agregar una nueva tarjeta</h4>
                      <div className="alert alert-secondary" role="alert">
                        <i className="bi bi-shield-lock-fill me-2" aria-hidden="true"></i>
                        Los números se cifran con AES-256, se almacenan separados del resto de la base de datos y nunca
                        guardamos tu código de seguridad (CVV).
                      </div>
                      <div className="row g-3">
                        <div className="col-12">
                          <label htmlFor="cardholderName" className="form-label">
                            Titular de la tarjeta
                          </label>
                          <input
                            id="cardholderName"
                            name="cardholderName"
                            type="text"
                            autoComplete="cc-name"
                            className={`form-control ${cardErrors.cardholderName ? 'is-invalid' : ''}`}
                            value={cardForm.cardholderName}
                            onChange={handleCardInputChange}
                            placeholder="Nombre y apellido"
                          />
                          {cardErrors.cardholderName && (
                            <div className="invalid-feedback">{cardErrors.cardholderName}</div>
                          )}
                        </div>
                        <div className="col-12">
                          <label htmlFor="cardNumber" className="form-label">
                            Número de tarjeta
                          </label>
                          <input
                            id="cardNumber"
                            name="cardNumber"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-number"
                            className={`form-control ${cardErrors.cardNumber ? 'is-invalid' : ''}`}
                            value={cardForm.cardNumber}
                            onChange={handleCardInputChange}
                            placeholder="0000 0000 0000 0000"
                          />
                          {cardErrors.cardNumber && <div className="invalid-feedback">{cardErrors.cardNumber}</div>}
                        </div>
                        <div className="col-6 col-md-3">
                          <label htmlFor="expiryMonth" className="form-label">
                            Mes (MM)
                          </label>
                          <input
                            id="expiryMonth"
                            name="expiryMonth"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp-month"
                            className={`form-control ${cardErrors.expiryMonth ? 'is-invalid' : ''}`}
                            value={cardForm.expiryMonth}
                            onChange={handleCardInputChange}
                            placeholder="MM"
                          />
                          {cardErrors.expiryMonth && <div className="invalid-feedback">{cardErrors.expiryMonth}</div>}
                        </div>
                        <div className="col-6 col-md-3">
                          <label htmlFor="expiryYear" className="form-label">
                            Año (AAAA)
                          </label>
                          <input
                            id="expiryYear"
                            name="expiryYear"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp-year"
                            className={`form-control ${cardErrors.expiryYear ? 'is-invalid' : ''}`}
                            value={cardForm.expiryYear}
                            onChange={handleCardInputChange}
                            placeholder="2028"
                          />
                          {cardErrors.expiryYear && <div className="invalid-feedback">{cardErrors.expiryYear}</div>}
                        </div>
                        <div className="col-12">
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            disabled={savingMethod}
                            onClick={handleCardSubmit}
                          >
                            {savingMethod ? (
                              <span className="d-inline-flex align-items-center gap-2">
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                Guardando...
                              </span>
                            ) : (
                              'Guardar tarjeta segura'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethodType === 'mercadopago' && (
                  <div className="alert alert-primary" role="alert">
                    <i className="bi bi-currency-exchange me-2" aria-hidden="true"></i>
                    Convertiremos el valor mensual ({formatCurrency(
                      getBaseMonthlyPrice(selectedPlan),
                      getBaseCurrency(selectedPlan)
                    )}) a
                    pesos argentinos utilizando la cotización de compra del dólar blue al momento de confirmar el pago en
                    Mercado Pago.
                  </div>
                )}

                {infoMessage && (
                  <div className="alert alert-success mt-4" role="alert">
                    {infoMessage}
                  </div>
                )}

                {errorMessage && (
                  <div className="alert alert-danger mt-4" role="alert">
                    {errorMessage}
                  </div>
                )}

                {renderCheckoutSummary()}

                <div className="d-flex flex-column flex-md-row gap-3 mt-4">
                  <button type="submit" className="btn btn-primary" disabled={checkoutLoading}>
                    {checkoutLoading ? (
                      <span className="d-inline-flex align-items-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Preparando cobro seguro...
                      </span>
                    ) : (
                      'Confirmar suscripción segura'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setSelectedPlan(null);
                      setPaymentMethods([]);
                      setSelectedMethodId('');
                      setCheckoutResult(null);
                      setCardErrors({});
                      resetMessages();
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 p-4 bg-light rounded-4 shadow-sm subscription-help">
        <h2 className="h5 text-uppercase text-primary mb-3">¿Cómo funciona la suscripción?</h2>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="d-flex gap-3 align-items-start">
              <i className="bi bi-1-circle-fill text-primary fs-3" aria-hidden="true"></i>
              <div>
                <h3 className="h6 text-uppercase mb-1">Activá tu prueba</h3>
                <p className="mb-0 text-muted">
                  El delegado del club inicia el período de prueba sin costo y puede cargar patinadores inmediatamente.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex gap-3 align-items-start">
              <i className="bi bi-2-circle-fill text-primary fs-3" aria-hidden="true"></i>
              <div>
                <h3 className="h6 text-uppercase mb-1">Elegí el cupo</h3>
                <p className="mb-0 text-muted">
                  Seleccioná el plan según la cantidad de deportistas que va a gestionar tu club cada mes.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="d-flex gap-3 align-items-start">
              <i className="bi bi-3-circle-fill text-primary fs-3" aria-hidden="true"></i>
              <div>
                <h3 className="h6 text-uppercase mb-1">Acceso completo</h3>
                <p className="mb-0 text-muted">
                  Con la suscripción activa, todos los roles del club mantienen acceso a torneos, reportes y seguimiento
                  deportivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
