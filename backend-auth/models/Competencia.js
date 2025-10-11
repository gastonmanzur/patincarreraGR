import mongoose from 'mongoose';

const competenciaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    torneo: { type: mongoose.Schema.Types.ObjectId, ref: 'Torneo', required: true },
    fecha: { type: Date, required: true },
    imagen: { type: String },
    listaBuenaFe: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patinador' }],
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Competencia', competenciaSchema);
