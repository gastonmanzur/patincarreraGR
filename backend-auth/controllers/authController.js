// controllers/authController.js
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import enviarEmailConfirmacion from '../utils/enviarEmailConfirmacion.js';
import jwt from 'jsonwebtoken';

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
    const { email, password } = req.body;
  
    const usuario = await User.findOne({ email });
  
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  
    if (!usuario.confirmado) {
      return res.status(403).json({ mensaje: 'Tenés que confirmar tu cuenta primero' });
    }
  
    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
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
        foto: usuario.foto
      }
    });
  };
  