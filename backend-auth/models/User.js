const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  email: { type: String, required: true, unique: true },
 password: {
  type: String,
  required: function () {
    return !this.googleId;
  }
},
rol: { type: String, enum: ['Delegado', 'Tecnico', 'Deportista'], default: 'Deportista' },
confirmado: { type: Boolean, default: false },
  tokenConfirmacion: { type: String },
  googleId: { type: String }, // por si se loguea con Google
  foto: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
