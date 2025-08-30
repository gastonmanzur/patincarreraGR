import mongoose from 'mongoose';

const progresoSchema = new mongoose.Schema(
  {
    patinador: { type: mongoose.Schema.Types.ObjectId, ref: 'Patinador', required: true },
    tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Progreso = mongoose.model('Progreso', progresoSchema);
export default Progreso;
