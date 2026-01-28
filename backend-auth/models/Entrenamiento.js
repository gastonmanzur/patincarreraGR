import mongoose from 'mongoose';

const asistenciaSchema = new mongoose.Schema(
  {
    patinador: { type: mongoose.Schema.Types.ObjectId, ref: 'Patinador', required: true },
    estado: {
      type: String,
      enum: ['Presente', 'Ausente', 'No entrena'],
      default: 'Ausente'
    }
  },
  { _id: false }
);

const entrenamientoSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    asistencias: [asistenciaSchema],
    tecnico: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true }
  },
  { timestamps: true }
);

const Entrenamiento = mongoose.model('Entrenamiento', entrenamientoSchema);
export default Entrenamiento;

