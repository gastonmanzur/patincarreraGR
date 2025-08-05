// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { registrarUsuario } = require('../controllers/authController');
const { confirmarCuenta } = require('../controllers/authController');
const { loginUsuario } = require('../controllers/authController');
const passport = require('passport');
const jwt = require('jsonwebtoken');

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
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.redirect(`${process.env.FRONTEND_URL}/google-success?token=${token}`);
    
  }
);




module.exports = router;
