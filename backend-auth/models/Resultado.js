import mongoose from 'mongoose';

const resultadoSchema = new mongoose.Schema(
  {
    competencia: { type: mongoose.Schema.Types.ObjectId, ref: 'Competencia', required: true },
    nombre: { type: String, required: true },
    club: { type: String, required: true },
    numero: { type: Number, required: true },
    puntos: { type: Number, required: true },
    categoria: { type: String },
    tiempo: { type: String },
    posicion: { type: Number }
  },
  { timestamps: true }
);

export default mongoose.model('Resultado', resultadoSchema);
