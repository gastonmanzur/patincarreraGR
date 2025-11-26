// controllers/authController.js
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import enviarEmailConfirmacion from '../utils/enviarEmailConfirmacion.js';
import jwt from 'jsonwebtoken';
import { comparePasswordWithHash } from '../utils/passwordUtils.js';
import { loadClubSubscription } from '../utils/subscriptionUtils.js';

// Clave JWT unificada
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

export const registrarUsuario = async (req, res) => {
  const { nombre, apellido, email, password, confirmarPassword } = req.body;

  if (password !== confirmarPassword) {
    return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
  }

  const usuarioExistente = await User.findOne({ email });
  if (usuarioExistente) {
    return res.status(400).json({ mensaje: 'Ese email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(20).toString('hex');

  const nuevoUsuario = new User({
    nombre,
    apellido,
    email,
    password: hashedPassword,
    tokenConfirmacion: token,
  });

  await nuevoUsuario.save();

  // Enviar email de confirmación
  await enviarEmailConfirmacion(email, token);

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
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (!usuario.confirmado) {
      return res.status(403).json({ mensaje: 'Tenés que confirmar tu cuenta primero' });
    }

    if (!usuario.password) {
      return res
        .status(400)
        .json({
          mensaje:
            'Este usuario se registró con Google y no tiene una contraseña local. Iniciá sesión con Google.'
        });
    }

    const comparacion = await comparePasswordWithHash(password, usuario.password);

    if (!comparacion.matches) {
      if (comparacion.reason === 'invalid-hash') {
        console.warn(
          `Hash de contraseña inválido detectado para el usuario ${email}. Se solicita restablecer contraseña.`
        );
        return res.status(400).json({
          mensaje:
            'No pudimos validar tus credenciales. Restablecé tu contraseña o contactá al administrador.'
        });
      }

      if (comparacion.reason === 'error') {
        console.error('Error comparando la contraseña del usuario', comparacion.error);
        return res.status(500).json({ mensaje: 'Error al iniciar sesión' });
      }

      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    let clubSubscription = null;
    if (usuario.club) {
      const subscriptionResult = await loadClubSubscription(usuario.club, { persistDefaults: true });
      clubSubscription = subscriptionResult?.subscriptionState ?? null;
    }

    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      mensaje: 'Login exitoso',
      token,
      usuario: {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        foto: usuario.foto,
        club: usuario.club ? usuario.club.toString() : null
      },
      clubSubscription
    });
  } catch (error) {
    console.error('Error en loginUsuario', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
};
  