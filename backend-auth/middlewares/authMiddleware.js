// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.protegerRuta = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No autorizado. Token no encontrado.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decodificado; // { id, rol }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

// middlddeware de roles

exports.permitirRol = (...roles) => {
    return (req, res, next) => {
      if (!roles.includes(req.usuario.rol)) {
        return res.status(403).json({ mensaje: 'Acceso denegado: rol insuficiente' });
      }
      next();
    };
  };
  
