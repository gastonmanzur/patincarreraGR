import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { loadClubSubscription } from '../utils/subscriptionUtils.js';

const formatDateForLocale = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const protegerRuta = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No autorizado. Token no encontrado.' });
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

  try {
    const decodificado = jwt.verify(token, JWT_SECRET);

    const usuario = await User.findById(decodificado.id).select('rol club');
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado' });
    }

    req.usuario = {
      id: usuario._id.toString(),
      rol: usuario.rol,
      club: usuario.club ? usuario.club.toString() : null
    };

    req.club = null;

    const rolNormalizado = typeof req.usuario.rol === 'string' ? req.usuario.rol.toLowerCase() : '';
    const debeValidarSuscripcion = rolNormalizado && rolNormalizado !== 'admin' && req.usuario.club;

    if (debeValidarSuscripcion) {
      const resultadoSuscripcion = await loadClubSubscription(req.usuario.club, {
        persistDefaults: true
      });

      if (!resultadoSuscripcion) {
        return res.status(403).json({ mensaje: 'El club asociado al usuario no existe' });
      }

      const { club, subscriptionState } = resultadoSuscripcion;

      req.club = {
        id: club._id.toString(),
        nombre: club.nombre,
        subscription: subscriptionState
      };

      if (!subscriptionState?.isActive) {
        const rawPath = `${req.baseUrl || ''}${req.path || ''}`;
        const normalisePath = (value) => {
          if (!value) return '';
          return value.split('?')[0].replace(/\/+$/, '') || '/';
        };

        const requestPath = normalisePath(req.originalUrl) || normalisePath(rawPath);
        const allowedInactivePaths = new Set(['/api/protegido/usuario']);
        const isAllowed =
          allowedInactivePaths.has(requestPath) ||
          allowedInactivePaths.has(normalisePath(rawPath)) ||
          allowedInactivePaths.has(normalisePath(req.path));

        if (!isAllowed) {
          const trialExpiredMessage = subscriptionState.trialExpired
            ? `El período de prueba venció el ${formatDateForLocale(
                subscriptionState.trialEndsAt
              )}. Activá la suscripción para seguir usando la plataforma.`
            : '';

          const inactiveMessage =
            trialExpiredMessage ||
            'La suscripción del club está inactiva. Contactá a tu delegado para regularizar el pago.';

          return res.status(402).json({
            mensaje: inactiveMessage,
            subscription: subscriptionState
          });
        }
      }
    }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

const normalizarRol = (valor) =>
  typeof valor === 'string' ? valor.trim().toLowerCase() : valor;

export const permitirRol = (...roles) => {
  const rolesNormalizados = roles.map((rol) => normalizarRol(rol)).filter(Boolean);

  return (req, res, next) => {
    const rolUsuario = normalizarRol(req.usuario.rol);

    if (!rolesNormalizados.includes(rolUsuario)) {
      return res.status(403).json({ mensaje: 'Acceso denegado: rol insuficiente' });
    }
    next();
  };
};
