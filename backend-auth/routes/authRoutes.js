// routes/authRoutes.js
import express from 'express';
import {
  registrarUsuario,
  confirmarCuenta,
  loginUsuario
} from '../controllers/authController.js';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Clave JWT consistente en toda la app
const JWT_SECRET = process.env.JWT_SECRET || 'secreto';

router.post('/registro', registrarUsuario);
router.get('/confirmar/:token', confirmarCuenta);
router.post('/login', loginUsuario);



// Iniciar login con Google
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));



// Callback de Google
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user._id,
        rol: req.user.rol,
        foto: req.user.foto
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.redirect(`${process.env.FRONTEND_URL}/google-success?token=${token}`);
    
  }
);




export default router;
