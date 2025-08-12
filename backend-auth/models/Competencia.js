import mongoose from 'mongoose';

const competenciaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    torneo: { type: mongoose.Schema.Types.ObjectId, ref: 'Torneo', required: true },
    fecha: { type: Date, required: true },
    listaBuenaFe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patinador' }]
  },
  { timestamps: true }
);

export default mongoose.model('Competencia', competenciaSchema);
