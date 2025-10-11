import mongoose from 'mongoose';

const progresoSchema = new mongoose.Schema(
  {
    patinador: { type: mongoose.Schema.Types.ObjectId, ref: 'Patinador', required: true },
    tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now },
    enviado: { type: Boolean, default: false },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true }
  },
  { timestamps: true }
);

const Progreso = mongoose.model('Progreso', progresoSchema);
export default Progreso;
