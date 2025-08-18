import mongoose from 'mongoose';

const incidenciaSchema = new mongoose.Schema(
  {
    competenciaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competencia', required: true },
    filaRaw: { type: mongoose.Schema.Types.Mixed, required: true },
    motivo: { type: String, required: true },
    sugerencias: [mongoose.Schema.Types.Mixed]
  },
  { timestamps: { createdAt: 'creadoEl', updatedAt: false } }
);

export default mongoose.model('IncidenciaImportacion', incidenciaSchema);
