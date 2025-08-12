import mongoose from 'mongoose';

const resultadoSchema = new mongoose.Schema(
  {
    competencia: { type: mongoose.Schema.Types.ObjectId, ref: 'Competencia', required: true },
    nombre: { type: String, required: true },
    club: { type: String, required: true },
    tiempo: { type: String },
    posicion: { type: Number }
  },
  { timestamps: true }
);

export default mongoose.model('Resultado', resultadoSchema);
