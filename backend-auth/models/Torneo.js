import mongoose from 'mongoose';

const torneoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    fechaInicio: { type: Date, required: true },
    fechaFin: { type: Date, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Torneo', torneoSchema);
