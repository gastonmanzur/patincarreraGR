// controllers/authController.js
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import enviarEmailConfirmacion from '../utils/enviarEmailConfirmacion.js';
import jwt from 'jsonwebtoken';

// Clave JWT unificada
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

const normalizarEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

export const registrarUsuario = async (req, res) => {
  const { nombre, apellido, email, password, confirmarPassword } = req.body;
  const emailNormalizado = normalizarEmail(email);

  if (password !== confirmarPassword) {
    return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
  }

  if (!emailNormalizado) {
    return res.status(400).json({ mensaje: 'Email inválido' });
  }

  const usuarioExistente = await User.findOne({ email: emailNormalizado });
  if (usuarioExistente) {
    return res.status(400).json({ mensaje: 'Ese email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(20).toString('hex');

  const nuevoUsuario = new User({
    nombre,
    apellido,
    email: emailNormalizado,
    password: hashedPassword,
    tokenConfirmacion: token,
  });

  await nuevoUsuario.save();

  // Enviar email de confirmación
  await enviarEmailConfirmacion(emailNormalizado, token);

  res.status(201).json({ mensaje: 'Registro exitoso. Revisa tu email para confirmar la cuenta.' });
};

// Confirmar cuenta con token
export const confirmarCuenta = async (req, res) => {
    const { token } = req.params;
  
    const usuario = await User.findOne({ tokenConfirmacion: token });
  
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Token no válido o ya usado' });
    }
  
    usuario.confirmado = true;
    usuario.tokenConfirmacion = null;
  
    await usuario.save();
  
    res.status(200).json({ mensaje: 'Cuenta confirmada. Ya podés iniciar sesión.' });
  };
  
// Login de usuario
export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const emailNormalizado = normalizarEmail(email);

    if (!emailNormalizado) {
      return res.status(400).json({ mensaje: 'Email inválido' });
    }

    if (typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ mensaje: 'Contraseña inválida' });
    }

    const usuario = await User.findOne({ email: emailNormalizado });

    if (!usuario) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    if (!usuario.confirmado) {
      return res.status(403).json({ mensaje: 'Tenés que confirmar tu cuenta primero' });
    }


    if (!usuario.password) {
      return res.status(400).json({
        mensaje:
          'Este usuario se registró con Google y no tiene una contraseña local. Iniciá sesión con Google.'
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      usuario: {
        nombre: usuario.nombre,
        rol: usuario.rol,
        foto: usuario.foto || ''
      }
    });
  } catch (error) {
    console.error('Error en loginUsuario', error);
    return res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
};
  