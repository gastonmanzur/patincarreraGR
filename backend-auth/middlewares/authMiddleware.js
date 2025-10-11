import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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
