import jwt from 'jsonwebtoken';

export const protegerRuta = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No autorizado. Token no encontrado.' });
  }

  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

  try {
    const decodificado = jwt.verify(token, JWT_SECRET);
    req.usuario = decodificado; // { id, rol }
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
