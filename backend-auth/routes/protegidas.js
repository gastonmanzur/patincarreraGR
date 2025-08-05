const express = require('express');
const router = express.Router();
const { protegerRuta, permitirRol } = require('../middlewares/authMiddleware');
const User = require('../models/User');
const upload = require('../utils/multer');


router.get('/usuario', protegerRuta, async (req, res) => {
  const usuario = await User.findById(req.usuario.id).select('-password');
  res.json({ usuario });
});


router.get('/admin', protegerRuta, permitirRol('admin'), (req, res) => {
  res.json({ mensaje: 'Acceso solo para administradores' });
});


router.get('/usuarios', protegerRuta, permitirRol('admin'), async (req, res) => {
  const usuarios = await User.find().select('-password');
  res.json(usuarios);
});

router.post('/foto-perfil', protegerRuta, upload.single('foto'), async (req, res) => {
  try {
    const user = await User.findById(req.usuario.id);
    user.foto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    await user.save();
    res.json({ mensaje: 'Foto actualizada', foto: user.foto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar la foto' });
  }
});


module.exports = router;
