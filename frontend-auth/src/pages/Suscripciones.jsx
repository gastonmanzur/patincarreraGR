import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const FALLBACK_TRIAL_DAYS = 30;

const FALLBACK_PLANS = [
  {
    id: 'starter',
    name: 'Club Inicial',
    description: 'Ideal para clubes que están comenzando su recorrido competitivo.',
    monthlyPrice: 10,
    currency: 'USD',
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
    currency: 'USD',
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
    currency: 'USD',
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
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(price);
  } catch {
    return `${currency} ${price}`;
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

export default function Suscripciones() {
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [trialDays, setTrialDays] = useState(FALLBACK_TRIAL_DAYS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-6 fw-bold text-uppercase">Planes de suscripción para clubes</h1>
        <p className="lead text-muted">
          Elegí la capacidad de patinadores que mejor se adapte a tu institución y activá todas las
          funciones de la plataforma.
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
                    {formatCurrency(plan.monthlyPrice, plan.currency)}
                  </div>
                  <p className="text-muted mb-0">{buildAthleteRangeLabel(plan)}</p>
                </div>
                <ul className="list-unstyled flex-grow-1">
                  {plan.features.map((feature, index) => (
                    <li className="d-flex align-items-start mb-2" key={`${plan.id}-${index}`}>
                      <i className="bi bi-check-circle-fill text-success me-2" aria-hidden="true"></i>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  className="btn btn-primary w-100 mt-auto"
                  href="mailto:patincarreragr25@gmail.com?subject=Consulta%20planes%20Pat%C3%ADn%20Carrera"
                >
                  Consultar este plan
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 p-4 bg-light rounded-4 shadow-sm subscription-help">
        <h2 className="h5 text-uppercase text-primary mb-3">¿Cómo funciona la suscripción?</h2>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="d-flex gap-3 align-items-start">
              <i className="bi bi-1-circle-fill text-primary fs-3" aria-hidden="true"></i>
              <div>
                <h3 className="h6 text-uppercase mb-1">Activá tu prueba</h3>
                <p className="mb-0 text-muted">
                  El delegado del club inicia el período de prueba sin costo y puede cargar patinadores
                  inmediatamente.
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
                  Con la suscripción activa, todos los roles del club mantienen acceso a torneos, reportes y
                  seguimiento deportivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
